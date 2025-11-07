import torch
import torch.nn as nn
import torch.nn.functional as F

class IntentClassifier(nn.Module):
    """
    Multi-task intent classification model with enhanced timeframe outputs
    Outputs:
      - intent_logits: [batch, num_intent_classes]
      - sub_intent_logits: [batch, num_sub_intent_classes]
      - timeframe_logits: [batch, num_timeframe_classes]
      - forecast_logits: [batch, num_forecast_classes]
      - day_offset: [batch, 1] (0-6, which day from now)
      - hour_of_day: [batch, 1] (0-23, hour within the day)
      - day_duration: [batch, 1] (0-7, number of days)
      - hour_duration: [batch, 1] (0-168, total hours)
      - confidence: [batch, 1] (0-1)
    """
    
    def __init__(
        self,
        vocab_size,
        embed_dim=128,
        hidden_dim=256,
        num_intent_classes=17,
        num_sub_intent_classes=30,  # Increased for more sub-intents
        num_timeframe_classes=5,
        num_forecast_classes=3,
        dropout=0.3
    ):
        super().__init__()
        
        # Embedding layer
        self.embedding = nn.Embedding(vocab_size, embed_dim, padding_idx=0)
        
        # Bidirectional LSTM
        self.lstm = nn.LSTM(
            embed_dim,
            hidden_dim // 2,
            num_layers=2,
            bidirectional=True,
            batch_first=True,
            dropout=dropout
        )
        
        # Attention mechanism
        self.attention = nn.Sequential(
            nn.Linear(hidden_dim, hidden_dim),
            nn.Tanh(),
            nn.Linear(hidden_dim, 1)
        )
        
        # Shared feature extraction
        self.shared_fc = nn.Sequential(
            nn.Linear(hidden_dim, hidden_dim),
            nn.ReLU(),
            nn.Dropout(dropout),
            nn.Linear(hidden_dim, hidden_dim),
            nn.ReLU(),
            nn.Dropout(dropout)
        )
        
        # Task-specific heads
        self.intent_head = nn.Linear(hidden_dim, num_intent_classes)
        self.sub_intent_head = nn.Linear(hidden_dim, num_sub_intent_classes)
        self.timeframe_head = nn.Linear(hidden_dim, num_timeframe_classes)
        self.forecast_head = nn.Linear(hidden_dim, num_forecast_classes)
        
        # Enhanced temporal regression heads
        # Day offset: which day from now (0-6)
        self.day_offset_head = nn.Sequential(
            nn.Linear(hidden_dim, 64),
            nn.ReLU(),
            nn.Dropout(dropout),
            nn.Linear(64, 1),
            nn.Sigmoid()  # Output 0-1, scale to 0-6
        )
        
        # Hour of day: specific hour (0-23)
        self.hour_of_day_head = nn.Sequential(
            nn.Linear(hidden_dim, 64),
            nn.ReLU(),
            nn.Dropout(dropout),
            nn.Linear(64, 1),
            nn.Sigmoid()  # Output 0-1, scale to 0-23
        )
        
        # Day duration: number of days (0-7)
        self.day_duration_head = nn.Sequential(
            nn.Linear(hidden_dim, 64),
            nn.ReLU(),
            nn.Dropout(dropout),
            nn.Linear(64, 1),
            nn.Sigmoid()  # Output 0-1, scale to 0-7
        )
        
        # Hour duration: total hours (0-168)
        self.hour_duration_head = nn.Sequential(
            nn.Linear(hidden_dim, 64),
            nn.ReLU(),
            nn.Dropout(dropout),
            nn.Linear(64, 1),
            nn.Sigmoid()  # Output 0-1, scale to 0-168
        )
        
        # Confidence estimation head
        self.confidence_head = nn.Sequential(
            nn.Linear(hidden_dim, 64),
            nn.ReLU(),
            nn.Dropout(dropout),
            nn.Linear(64, 1),
            nn.Sigmoid()
        )
        
    def forward(self, x):
        # x: [batch, seq_len]
        
        # Embedding
        embedded = self.embedding(x)  # [batch, seq_len, embed_dim]
        
        # LSTM
        lstm_out, _ = self.lstm(embedded)  # [batch, seq_len, hidden_dim]
        
        # Attention pooling
        attention_weights = F.softmax(self.attention(lstm_out), dim=1)  # [batch, seq_len, 1]
        attended = torch.sum(attention_weights * lstm_out, dim=1)  # [batch, hidden_dim]
        
        # Shared features
        features = self.shared_fc(attended)  # [batch, hidden_dim]
        
        # Task outputs
        intent_logits = self.intent_head(features)
        sub_intent_logits = self.sub_intent_head(features)
        timeframe_logits = self.timeframe_head(features)
        forecast_logits = self.forecast_head(features)
        
        # Temporal outputs (normalized 0-1)
        day_offset = self.day_offset_head(features)
        hour_of_day = self.hour_of_day_head(features)
        day_duration = self.day_duration_head(features)
        hour_duration = self.hour_duration_head(features)
        confidence = self.confidence_head(features)
        
        return {
            'intent_logits': intent_logits,
            'sub_intent_logits': sub_intent_logits,
            'timeframe_logits': timeframe_logits,
            'forecast_logits': forecast_logits,
            'day_offset': day_offset,
            'hour_of_day': hour_of_day,
            'day_duration': day_duration,
            'hour_duration': hour_duration,
            'confidence': confidence
        }

class IntentLoss(nn.Module):
    """Multi-task loss with enhanced temporal components"""
    
    def __init__(self):
        super().__init__()
        self.ce_loss = nn.CrossEntropyLoss()
        self.mse_loss = nn.MSELoss()
        
    def forward(self, outputs, targets):
        intent_loss = self.ce_loss(outputs['intent_logits'], targets['intent'])
        sub_intent_loss = self.ce_loss(outputs['sub_intent_logits'], targets['sub_intent'])
        timeframe_loss = self.ce_loss(outputs['timeframe_logits'], targets['timeframe'])
        forecast_loss = self.ce_loss(outputs['forecast_logits'], targets['forecast'])
        
        # Temporal losses
        day_offset_loss = self.mse_loss(
            outputs['day_offset'].squeeze(),
            targets['day_offset']
        )
        hour_of_day_loss = self.mse_loss(
            outputs['hour_of_day'].squeeze(),
            targets['hour_of_day']
        )
        day_duration_loss = self.mse_loss(
            outputs['day_duration'].squeeze(),
            targets['day_duration']
        )
        hour_duration_loss = self.mse_loss(
            outputs['hour_duration'].squeeze(),
            targets['hour_duration']
        )
        
        # Weighted sum
        total_loss = (
            2.0 * intent_loss +
            1.5 * sub_intent_loss +
            1.5 * timeframe_loss +
            1.0 * forecast_loss +
            1.0 * day_offset_loss +
            1.0 * hour_of_day_loss +
            0.8 * day_duration_loss +
            1.2 * hour_duration_loss
        )
        
        return {
            'total': total_loss,
            'intent': intent_loss,
            'sub_intent': sub_intent_loss,
            'timeframe': timeframe_loss,
            'forecast': forecast_loss,
            'day_offset': day_offset_loss,
            'hour_of_day': hour_of_day_loss,
            'day_duration': day_duration_loss,
            'hour_duration': hour_duration_loss
        }

def create_model(vocab_size, num_intent, num_sub_intent, num_timeframe, num_forecast):
    """Factory function to create model"""
    return IntentClassifier(
        vocab_size=vocab_size,
        embed_dim=128,
        hidden_dim=256,
        num_intent_classes=num_intent,
        num_sub_intent_classes=num_sub_intent,
        num_timeframe_classes=num_timeframe,
        num_forecast_classes=num_forecast,
        dropout=0.3
    )