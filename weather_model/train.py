import torch
import torch.optim as optim
from torch.utils.data import TensorDataset, DataLoader
import numpy as np
import json
from model import create_model, IntentLoss
from sklearn.metrics import accuracy_score, mean_absolute_error
import matplotlib.pyplot as plt
from config import BASE_DIR

class IntentTrainer:
    def __init__(self, model, device='cpu'):
        self.model = model.to(device)
        self.device = device
        self.criterion = IntentLoss()
        self.optimizer = optim.AdamW(model.parameters(), lr=0.001, weight_decay=0.01)
        try:
            self.scheduler = optim.lr_scheduler.ReduceLROnPlateau(
                self.optimizer, mode='min', factor=0.5, patience=3, verbose=True
            )
        except TypeError:
            self.scheduler = optim.lr_scheduler.ReduceLROnPlateau(
                self.optimizer, mode='min', factor=0.5, patience=3
            )
        self.history = {
            'train_loss': [],
            'val_loss': [],
            'intent_acc': [],
            'sub_intent_acc': [],
            'timeframe_acc': [],
            'forecast_acc': [],
            'day_offset_mae': [],
            'hour_of_day_mae': []
        }
        
    def train_epoch(self, train_loader):
        self.model.train()
        total_loss = 0
        
        for batch_idx, (X, y_intent, y_sub, y_time, y_fore, y_day_off, y_hour, y_day_dur, y_hour_dur) in enumerate(train_loader):
            X = X.to(self.device)
            y_intent = y_intent.to(self.device)
            y_sub = y_sub.to(self.device)
            y_time = y_time.to(self.device)
            y_fore = y_fore.to(self.device)
            y_day_off = y_day_off.to(self.device)
            y_hour = y_hour.to(self.device)
            y_day_dur = y_day_dur.to(self.device)
            y_hour_dur = y_hour_dur.to(self.device)
            
            self.optimizer.zero_grad()
            
            outputs = self.model(X)
            
            targets = {
                'intent': y_intent,
                'sub_intent': y_sub,
                'timeframe': y_time,
                'forecast': y_fore,
                'day_offset': y_day_off,
                'hour_of_day': y_hour,
                'day_duration': y_day_dur,
                'hour_duration': y_hour_dur
            }
            
            losses = self.criterion(outputs, targets)
            loss = losses['total']
            
            loss.backward()
            torch.nn.utils.clip_grad_norm_(self.model.parameters(), max_norm=1.0)
            self.optimizer.step()
            
            total_loss += loss.item()
            
            if batch_idx % 50 == 0:
                print(f"  Batch {batch_idx}/{len(train_loader)}, Loss: {loss.item():.4f}")
        
        return total_loss / len(train_loader)
    
    def evaluate(self, val_loader):
        self.model.eval()
        total_loss = 0
        
        all_intent_preds = []
        all_intent_true = []
        all_sub_intent_preds = []
        all_sub_intent_true = []
        all_timeframe_preds = []
        all_timeframe_true = []
        all_forecast_preds = []
        all_forecast_true = []
        all_day_offset_preds = []
        all_day_offset_true = []
        all_hour_of_day_preds = []
        all_hour_of_day_true = []
        
        with torch.no_grad():
            for X, y_intent, y_sub, y_time, y_fore, y_day_off, y_hour, y_day_dur, y_hour_dur in val_loader:
                X = X.to(self.device)
                y_intent = y_intent.to(self.device)
                y_sub = y_sub.to(self.device)
                y_time = y_time.to(self.device)
                y_fore = y_fore.to(self.device)
                y_day_off = y_day_off.to(self.device)
                y_hour = y_hour.to(self.device)
                y_day_dur = y_day_dur.to(self.device)
                y_hour_dur = y_hour_dur.to(self.device)
                
                outputs = self.model(X)
                
                targets = {
                    'intent': y_intent,
                    'sub_intent': y_sub,
                    'timeframe': y_time,
                    'forecast': y_fore,
                    'day_offset': y_day_off,
                    'hour_of_day': y_hour,
                    'day_duration': y_day_dur,
                    'hour_duration': y_hour_dur
                }
                
                losses = self.criterion(outputs, targets)
                total_loss += losses['total'].item()
                
                # Collect predictions
                all_intent_preds.extend(outputs['intent_logits'].argmax(dim=1).cpu().numpy())
                all_intent_true.extend(y_intent.cpu().numpy())
                
                all_sub_intent_preds.extend(outputs['sub_intent_logits'].argmax(dim=1).cpu().numpy())
                all_sub_intent_true.extend(y_sub.cpu().numpy())
                
                all_timeframe_preds.extend(outputs['timeframe_logits'].argmax(dim=1).cpu().numpy())
                all_timeframe_true.extend(y_time.cpu().numpy())
                
                all_forecast_preds.extend(outputs['forecast_logits'].argmax(dim=1).cpu().numpy())
                all_forecast_true.extend(y_fore.cpu().numpy())
                
                all_day_offset_preds.extend(outputs['day_offset'].squeeze().cpu().numpy())
                all_day_offset_true.extend(y_day_off.cpu().numpy())
                
                all_hour_of_day_preds.extend(outputs['hour_of_day'].squeeze().cpu().numpy())
                all_hour_of_day_true.extend(y_hour.cpu().numpy())
        
        # Calculate metrics
        intent_acc = accuracy_score(all_intent_true, all_intent_preds)
        sub_intent_acc = accuracy_score(all_sub_intent_true, all_sub_intent_preds)
        timeframe_acc = accuracy_score(all_timeframe_true, all_timeframe_preds)
        forecast_acc = accuracy_score(all_forecast_true, all_forecast_preds)
        day_offset_mae = mean_absolute_error(all_day_offset_true, all_day_offset_preds)
        hour_of_day_mae = mean_absolute_error(all_hour_of_day_true, all_hour_of_day_preds)
        
        return {
            'loss': total_loss / len(val_loader),
            'intent_acc': intent_acc,
            'sub_intent_acc': sub_intent_acc,
            'timeframe_acc': timeframe_acc,
            'forecast_acc': forecast_acc,
            'day_offset_mae': day_offset_mae,
            'hour_of_day_mae': hour_of_day_mae
        }
    
    def train(self, train_loader, val_loader, epochs=50, early_stop_patience=7):
        print(f"Training on device: {self.device}")
        print(f"Model parameters: {sum(p.numel() for p in self.model.parameters()):,}")
        
        best_val_loss = float('inf')
        patience_counter = 0
        
        for epoch in range(epochs):
            print(f"\nEpoch {epoch + 1}/{epochs}")
            
            train_loss = self.train_epoch(train_loader)
            val_metrics = self.evaluate(val_loader)
            
            self.history['train_loss'].append(train_loss)
            self.history['val_loss'].append(val_metrics['loss'])
            self.history['intent_acc'].append(val_metrics['intent_acc'])
            self.history['sub_intent_acc'].append(val_metrics['sub_intent_acc'])
            self.history['timeframe_acc'].append(val_metrics['timeframe_acc'])
            self.history['forecast_acc'].append(val_metrics['forecast_acc'])
            self.history['day_offset_mae'].append(val_metrics['day_offset_mae'])
            self.history['hour_of_day_mae'].append(val_metrics['hour_of_day_mae'])
            
            print(f"Train Loss: {train_loss:.4f}")
            print(f"Val Loss: {val_metrics['loss']:.4f}")
            print(f"Intent Acc: {val_metrics['intent_acc']:.4f}")
            print(f"Sub-Intent Acc: {val_metrics['sub_intent_acc']:.4f}")
            print(f"Timeframe Acc: {val_metrics['timeframe_acc']:.4f}")
            print(f"Forecast Acc: {val_metrics['forecast_acc']:.4f}")
            print(f"Day Offset MAE: {val_metrics['day_offset_mae']:.4f} (normalized)")
            print(f"Hour of Day MAE: {val_metrics['hour_of_day_mae']:.4f} (normalized)")
            
            # Learning rate scheduling
            self.scheduler.step(val_metrics['loss'])
            
            # Early stopping
            if val_metrics['loss'] < best_val_loss:
                best_val_loss = val_metrics['loss']
                patience_counter = 0
                torch.save(self.model.state_dict(), 'best_model.pt')
                print("✓ Saved best model")
            else:
                patience_counter += 1
                if patience_counter >= early_stop_patience:
                    print(f"\nEarly stopping triggered after {epoch + 1} epochs")
                    break
        
        # Load best model
        self.model.load_state_dict(torch.load('best_model.pt'))
        print("\nTraining completed!")
        
    def plot_history(self):
        fig, axes = plt.subplots(2, 3, figsize=(18, 10))
        
        # Loss
        axes[0, 0].plot(self.history['train_loss'], label='Train')
        axes[0, 0].plot(self.history['val_loss'], label='Val')
        axes[0, 0].set_title('Loss')
        axes[0, 0].set_xlabel('Epoch')
        axes[0, 0].set_ylabel('Loss')
        axes[0, 0].legend()
        axes[0, 0].grid(True)
        
        # Intent Accuracy
        axes[0, 1].plot(self.history['intent_acc'])
        axes[0, 1].set_title('Intent Accuracy')
        axes[0, 1].set_xlabel('Epoch')
        axes[0, 1].set_ylabel('Accuracy')
        axes[0, 1].grid(True)
        
        # Sub-Intent Accuracy
        axes[0, 2].plot(self.history['sub_intent_acc'])
        axes[0, 2].set_title('Sub-Intent Accuracy')
        axes[0, 2].set_xlabel('Epoch')
        axes[0, 2].set_ylabel('Accuracy')
        axes[0, 2].grid(True)
        
        # Timeframe & Forecast Accuracy
        axes[1, 0].plot(self.history['timeframe_acc'], label='Timeframe')
        axes[1, 0].plot(self.history['forecast_acc'], label='Forecast')
        axes[1, 0].set_title('Timeframe & Forecast Accuracy')
        axes[1, 0].set_xlabel('Epoch')
        axes[1, 0].set_ylabel('Accuracy')
        axes[1, 0].legend()
        axes[1, 0].grid(True)
        
        # Day Offset MAE
        axes[1, 1].plot(self.history['day_offset_mae'])
        axes[1, 1].set_title('Day Offset MAE (normalized)')
        axes[1, 1].set_xlabel('Epoch')
        axes[1, 1].set_ylabel('MAE')
        axes[1, 1].grid(True)
        
        # Hour of Day MAE
        axes[1, 2].plot(self.history['hour_of_day_mae'])
        axes[1, 2].set_title('Hour of Day MAE (normalized)')
        axes[1, 2].set_xlabel('Epoch')
        axes[1, 2].set_ylabel('MAE')
        axes[1, 2].grid(True)
        
        plt.tight_layout()
        plt.savefig('training_history.png', dpi=300)
        print("Saved training history plot to training_history.png")

def main():
    # Load preprocessed data
    data = np.load(BASE_DIR/'preprocessed_data.npz')
    
    # Load metadata
    with open(BASE_DIR/'model_artifacts/model_metadata.json', 'r') as f:
        metadata = json.load(f)
    
    # Create datasets
    train_dataset = TensorDataset(
        torch.LongTensor(data['X_train']),
        torch.LongTensor(data['y_intent_train']),
        torch.LongTensor(data['y_sub_intent_train']),
        torch.LongTensor(data['y_timeframe_train']),
        torch.LongTensor(data['y_forecast_train']),
        torch.FloatTensor(data['y_day_offset_train']),
        torch.FloatTensor(data['y_hour_of_day_train']),
        torch.FloatTensor(data['y_day_duration_train']),
        torch.FloatTensor(data['y_hour_duration_train'])
    )
    
    test_dataset = TensorDataset(
        torch.LongTensor(data['X_test']),
        torch.LongTensor(data['y_intent_test']),
        torch.LongTensor(data['y_sub_intent_test']),
        torch.LongTensor(data['y_timeframe_test']),
        torch.LongTensor(data['y_forecast_test']),
        torch.FloatTensor(data['y_day_offset_test']),
        torch.FloatTensor(data['y_hour_of_day_test']),
        torch.FloatTensor(data['y_day_duration_test']),
        torch.FloatTensor(data['y_hour_duration_test'])
    )
    
    # Create dataloaders
    train_loader = DataLoader(train_dataset, batch_size=64, shuffle=True)
    test_loader = DataLoader(test_dataset, batch_size=64, shuffle=False)
    
    # Create model
    model = create_model(
        vocab_size=metadata['vocab_size'],
        num_intent=len(metadata['intent_classes']),
        num_sub_intent=len(metadata['sub_intent_classes']),
        num_timeframe=len(metadata['timeframe_classes']),
        num_forecast=len(metadata['forecast_classes'])
    )
    
    # Train
    device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
    trainer = IntentTrainer(model, device=device)
    trainer.train(train_loader, test_loader, epochs=50)
    
    # Plot history
    trainer.plot_history()
    
    # Final evaluation
    print("\n=== Final Test Set Evaluation ===")
    final_metrics = trainer.evaluate(test_loader)
    print(json.dumps(final_metrics, indent=2))

if __name__ == "__main__":
    main()