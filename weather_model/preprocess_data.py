import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder
import json
import pickle
from config import BASE_DIR

class IntentDataPreprocessor:
    def __init__(self):
        self.intent_encoder = LabelEncoder()
        self.sub_intent_encoder = LabelEncoder()
        self.timeframe_encoder = LabelEncoder()
        self.forecast_encoder = LabelEncoder()
        self.vocab = {}
        self.vocab_size = 0
        self.max_length = 50
        
    def build_vocabulary(self, queries):
        """Build vocabulary from queries"""
        word_freq = {}
        for query in queries:
            for word in query.lower().split():
                word_freq[word] = word_freq.get(word, 0) + 1
        
        # Sort by frequency and assign indices
        sorted_words = sorted(word_freq.items(), key=lambda x: x[1], reverse=True)
        
        # Reserve indices: 0=PAD, 1=UNK
        self.vocab = {'<PAD>': 0, '<UNK>': 1}
        for idx, (word, _) in enumerate(sorted_words, start=2):
            self.vocab[word] = idx
        
        self.vocab_size = len(self.vocab)
        print(f"Vocabulary size: {self.vocab_size}")
        
    def encode_query(self, query):
        """Convert query to sequence of token indices"""
        tokens = query.lower().split()
        indices = [self.vocab.get(word, 1) for word in tokens]  # 1 = UNK
        
        # Pad or truncate
        if len(indices) < self.max_length:
            indices += [0] * (self.max_length - len(indices))
        else:
            indices = indices[:self.max_length]
        
        return indices
    
    def normalize_value(self, value, max_val):
        """Normalize value to 0-1 range"""
        return min(value / max_val, 1.0)
    
    def preprocess(self, csv_path, test_size=0.2):
        """Load and preprocess training data"""
        df = pd.read_csv(csv_path)
        
        print(f"Loaded {len(df)} samples")
        print(f"\nIntent distribution:\n{df['intent'].value_counts()}")
        print(f"\nTimeframe distribution:\n{df['timeframe_type'].value_counts()}")
        
        # Build vocabulary
        self.build_vocabulary(df['query'].values)
        
        # Encode queries
        X = np.array([self.encode_query(q) for q in df['query'].values])
        
        # Encode categorical labels
        y_intent = self.intent_encoder.fit_transform(df['intent'].values)
        y_sub_intent = self.sub_intent_encoder.fit_transform(df['sub_intent'].values)
        y_timeframe = self.timeframe_encoder.fit_transform(df['timeframe_type'].values)
        y_forecast = self.forecast_encoder.fit_transform(df['forecast_type'].values)
        
        # Normalize temporal values
        # day_offset: 0-6 days
        y_day_offset = np.array([self.normalize_value(d, 6) for d in df['day_offset'].values])
        
        # hour_of_day: 0-23 hours
        y_hour_of_day = np.array([self.normalize_value(h, 23) for h in df['hour_of_day'].values])
        
        # day_duration: 0-7 days
        y_day_duration = np.array([self.normalize_value(d, 7) for d in df['day_duration'].values])
        
        # hour_duration: 0-168 hours (1 week)
        y_hour_duration = np.array([self.normalize_value(h, 168) for h in df['hour_duration'].values])
        
        # Split data
        X_train, X_test, y_intent_train, y_intent_test = train_test_split(
            X, y_intent, test_size=test_size, random_state=42, stratify=y_intent
        )
        
        _, _, y_sub_intent_train, y_sub_intent_test = train_test_split(
            X, y_sub_intent, test_size=test_size, random_state=42, stratify=y_intent
        )
        
        _, _, y_timeframe_train, y_timeframe_test = train_test_split(
            X, y_timeframe, test_size=test_size, random_state=42, stratify=y_intent
        )
        
        _, _, y_forecast_train, y_forecast_test = train_test_split(
            X, y_forecast, test_size=test_size, random_state=42, stratify=y_intent
        )
        
        _, _, y_day_offset_train, y_day_offset_test = train_test_split(
            X, y_day_offset, test_size=test_size, random_state=42, stratify=y_intent
        )
        
        _, _, y_hour_of_day_train, y_hour_of_day_test = train_test_split(
            X, y_hour_of_day, test_size=test_size, random_state=42, stratify=y_intent
        )
        
        _, _, y_day_duration_train, y_day_duration_test = train_test_split(
            X, y_day_duration, test_size=test_size, random_state=42, stratify=y_intent
        )
        
        _, _, y_hour_duration_train, y_hour_duration_test = train_test_split(
            X, y_hour_duration, test_size=test_size, random_state=42, stratify=y_intent
        )
        
        print(f"\nTrain samples: {len(X_train)}")
        print(f"Test samples: {len(X_test)}")
        
        return {
            'X_train': X_train,
            'X_test': X_test,
            'y_intent_train': y_intent_train,
            'y_intent_test': y_intent_test,
            'y_sub_intent_train': y_sub_intent_train,
            'y_sub_intent_test': y_sub_intent_test,
            'y_timeframe_train': y_timeframe_train,
            'y_timeframe_test': y_timeframe_test,
            'y_forecast_train': y_forecast_train,
            'y_forecast_test': y_forecast_test,
            'y_day_offset_train': y_day_offset_train,
            'y_day_offset_test': y_day_offset_test,
            'y_hour_of_day_train': y_hour_of_day_train,
            'y_hour_of_day_test': y_hour_of_day_test,
            'y_day_duration_train': y_day_duration_train,
            'y_day_duration_test': y_day_duration_test,
            'y_hour_duration_train': y_hour_duration_train,
            'y_hour_duration_test': y_hour_duration_test,
        }
    
    def save_encoders(self, path=BASE_DIR/'model_artifacts'):
        """Save encoders and vocabulary"""
        import os
        os.makedirs(path, exist_ok=True)
        
        # Save encoders
        with open(f'{path}/intent_encoder.pkl', 'wb') as f:
            pickle.dump(self.intent_encoder, f)
        with open(f'{path}/sub_intent_encoder.pkl', 'wb') as f:
            pickle.dump(self.sub_intent_encoder, f)
        with open(f'{path}/timeframe_encoder.pkl', 'wb') as f:
            pickle.dump(self.timeframe_encoder, f)
        with open(f'{path}/forecast_encoder.pkl', 'wb') as f:
            pickle.dump(self.forecast_encoder, f)
        
        # Save vocabulary
        with open(f'{path}/vocabulary.json', 'w') as f:
            json.dump(self.vocab, f, indent=2)
        
        # Save label mappings for frontend
        metadata = {
            'vocab_size': self.vocab_size,
            'max_length': self.max_length,
            'intent_classes': self.intent_encoder.classes_.tolist(),
            'sub_intent_classes': self.sub_intent_encoder.classes_.tolist(),
            'timeframe_classes': self.timeframe_encoder.classes_.tolist(),
            'forecast_classes': self.forecast_encoder.classes_.tolist(),
            'temporal_normalization': {
                'day_offset': {
                    'range': [0, 6],
                    'description': 'Days from now (0=today, 1=tomorrow, etc.)',
                    'denormalize': 'normalized * 6'
                },
                'hour_of_day': {
                    'range': [0, 23],
                    'description': 'Hour within the day (24-hour format)',
                    'denormalize': 'normalized * 23'
                },
                'day_duration': {
                    'range': [0, 7],
                    'description': 'Number of days in the timeframe',
                    'denormalize': 'normalized * 7'
                },
                'hour_duration': {
                    'range': [0, 168],
                    'description': 'Total hours in the timeframe',
                    'denormalize': 'normalized * 168'
                }
            }
        }
        
        with open(f'{path}/model_metadata.json', 'w') as f:
            json.dump(metadata, f, indent=2)
        
        print(f"Saved encoders and metadata to {path}/")

if __name__ == "__main__":
    preprocessor = IntentDataPreprocessor()
    data = preprocessor.preprocess(BASE_DIR/'training_data.csv')
    preprocessor.save_encoders()
    
    # Save preprocessed data
    np.savez(BASE_DIR/'preprocessed_data.npz', **data)
    print("Saved preprocessed data to preprocessed_data.npz")