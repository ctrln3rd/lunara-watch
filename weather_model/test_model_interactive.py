import torch
import numpy as np
import json
import pickle
import pendulum
from colorama import init, Fore, Back, Style
import onnxruntime as ort
from model import create_model
from config import BASE_DIR

# Initialize colorama for cross-platform colored output
init(autoreset=True)

class InteractiveModelTester:
    def __init__(self, use_onnx=True):
        self.use_onnx = use_onnx
        self.session = None
        self.model = None
        self.vocabulary = {}
        self.metadata = {}
        self.encoders = {}
        
        print(f"{Fore.CYAN}{'='*70}")
        print(f"{Fore.CYAN}🧪 Interactive Weather Intent Model Tester v2.0")
        print(f"{Fore.CYAN}{'='*70}\n")
        
        self.load_model()
        
    def load_model(self):
        """Load model and associated artifacts"""
        try:
            # Load vocabulary
            print(f"{Fore.YELLOW}Loading vocabulary...")
            with open(BASE_DIR/'model_artifacts/vocabulary.json', 'r') as f:
                self.vocabulary = json.load(f)
            print(f"{Fore.GREEN}✓ Vocabulary loaded ({len(self.vocabulary)} tokens)")
            
            # Load metadata
            print(f"{Fore.YELLOW}Loading metadata...")
            with open(BASE_DIR/'model_artifacts/model_metadata.json', 'r') as f:
                self.metadata = json.load(f)
            print(f"{Fore.GREEN}✓ Metadata loaded")
            
            # Load encoders
            print(f"{Fore.YELLOW}Loading encoders...")
            with open(BASE_DIR/'model_artifacts/intent_encoder.pkl', 'rb') as f:
                self.encoders['intent'] = pickle.load(f)
            with open(BASE_DIR/'model_artifacts/sub_intent_encoder.pkl', 'rb') as f:
                self.encoders['sub_intent'] = pickle.load(f)
            with open(BASE_DIR/'model_artifacts/timeframe_encoder.pkl', 'rb') as f:
                self.encoders['timeframe'] = pickle.load(f)
            with open(BASE_DIR/'model_artifacts/forecast_encoder.pkl', 'rb') as f:
                self.encoders['forecast'] = pickle.load(f)
            print(f"{Fore.GREEN}✓ Encoders loaded")
            
            if self.use_onnx:
                # Load ONNX model
                print(f"{Fore.YELLOW}Loading ONNX model...")
                self.session = ort.InferenceSession(
                    BASE_DIR/'model_artifacts/intent_model.onnx',
                    providers=['CPUExecutionProvider']
                )
                print(f"{Fore.GREEN}✓ ONNX model loaded")
            else:
                # Load PyTorch model
                print(f"{Fore.YELLOW}Loading PyTorch model...")
                self.model = create_model(
                    vocab_size=self.metadata['vocab_size'],
                    num_intent=len(self.metadata['intent_classes']),
                    num_sub_intent=len(self.metadata['sub_intent_classes']),
                    num_timeframe=len(self.metadata['timeframe_classes']),
                    num_forecast=len(self.metadata['forecast_classes'])
                )
                self.model.load_state_dict(torch.load('best_model.pt', map_location='cpu'))
                self.model.eval()
                print(f"{Fore.GREEN}✓ PyTorch model loaded")
                
            print(f"\n{Fore.GREEN}{'='*70}")
            print(f"{Fore.GREEN}✨ Model v2.0 ready for inference!")
            print(f"{Fore.GREEN}   New: day_offset, hour_of_day, day_duration, hour_duration")
            print(f"{Fore.GREEN}{'='*70}\n")
            
        except Exception as e:
            print(f"{Fore.RED}❌ Error loading model: {str(e)}")
            raise
    
    def tokenize(self, query):
        """Tokenize input query"""
        tokens = query.lower().strip().split()
        max_length = self.metadata['max_length']
        
        # Convert to indices
        indices = [self.vocabulary.get(token, 1) for token in tokens]  # 1 = UNK
        
        # Pad or truncate
        if len(indices) < max_length:
            indices += [0] * (max_length - len(indices))
        else:
            indices = indices[:max_length]
        
        return indices
    
    def denormalize_day_offset(self, normalized):
        """Convert normalized day offset back to days (0-6)"""
        return round(normalized * 6)
    
    def denormalize_hour_of_day(self, normalized):
        """Convert normalized hour to actual hour (0-23)"""
        return round(normalized * 23)
    
    def denormalize_day_duration(self, normalized):
        """Convert normalized day duration back to days (0-7)"""
        return round(normalized * 7)
    
    def denormalize_hour_duration(self, normalized):
        """Convert normalized hour duration back to hours (0-168)"""
        return round(normalized * 168)
    
    def calculate_timeframe(self, timeframe_type, day_offset, hour_of_day, day_duration, hour_duration):
        """Calculate start and end times based on temporal values"""
        now = pendulum.now()
        
        if timeframe_type == 'absolute_day':
            # Use day offset and set to specific time
            start = now.add(days=day_offset).start_of('day').set(hour=hour_of_day)
        elif timeframe_type == 'relative_day':
            # Start from day offset
            start = now.add(days=day_offset).start_of('day').set(hour=hour_of_day)
        elif timeframe_type == 'absolute_time':
            # Specific time on a specific day
            start = now.add(days=day_offset).start_of('day').set(hour=hour_of_day)
        elif timeframe_type == 'relative_time':
            # Start from current time
            start = now
        else:
            start = now.add(days=day_offset).set(hour=hour_of_day)
        
        # Calculate end based on duration
        if day_duration > 0:
            end = start.add(days=day_duration)
        else:
            end = start.add(hours=hour_duration)
        
        return start, end
    
    def predict(self, query):
        """Run prediction on query"""
        # Tokenize
        input_ids = self.tokenize(query)
        
        if self.use_onnx:
            # ONNX inference
            input_tensor = np.array([input_ids], dtype=np.int64)
            outputs = self.session.run(None, {'input_ids': input_tensor})
            
            intent_logits = outputs[0][0]
            sub_intent_logits = outputs[1][0]
            timeframe_logits = outputs[2][0]
            forecast_logits = outputs[3][0]
            day_offset_norm = outputs[4][0][0]
            hour_of_day_norm = outputs[5][0][0]
            day_duration_norm = outputs[6][0][0]
            hour_duration_norm = outputs[7][0][0]
            confidence = outputs[8][0][0]
            
        else:
            # PyTorch inference
            input_tensor = torch.LongTensor([input_ids])
            
            with torch.no_grad():
                outputs = self.model(input_tensor)
            
            intent_logits = outputs['intent_logits'][0].numpy()
            sub_intent_logits = outputs['sub_intent_logits'][0].numpy()
            timeframe_logits = outputs['timeframe_logits'][0].numpy()
            forecast_logits = outputs['forecast_logits'][0].numpy()
            day_offset_norm = outputs['day_offset'][0][0].item()
            hour_of_day_norm = outputs['hour_of_day'][0][0].item()
            day_duration_norm = outputs['day_duration'][0][0].item()
            hour_duration_norm = outputs['hour_duration'][0][0].item()
            confidence = outputs['confidence'][0][0].item()
        
        # Get predictions
        intent_idx = np.argmax(intent_logits)
        sub_intent_idx = np.argmax(sub_intent_logits)
        timeframe_idx = np.argmax(timeframe_logits)
        forecast_idx = np.argmax(forecast_logits)
        
        intent = self.encoders['intent'].classes_[intent_idx]
        sub_intent = self.encoders['sub_intent'].classes_[sub_intent_idx]
        timeframe_type = self.encoders['timeframe'].classes_[timeframe_idx]
        forecast_type = self.encoders['forecast'].classes_[forecast_idx]
        
        # Denormalize temporal values
        day_offset = self.denormalize_day_offset(day_offset_norm)
        hour_of_day = self.denormalize_hour_of_day(hour_of_day_norm)
        day_duration = self.denormalize_day_duration(day_duration_norm)
        hour_duration = self.denormalize_hour_duration(hour_duration_norm)
        
        start, end = self.calculate_timeframe(
            timeframe_type, day_offset, hour_of_day, day_duration, hour_duration
        )
        
        # Get top-3 predictions with confidence
        intent_probs = self._softmax(intent_logits)
        sub_intent_probs = self._softmax(sub_intent_logits)
        timeframe_probs = self._softmax(timeframe_logits)
        
        intent_top3 = self._get_top_k(intent_probs, self.encoders['intent'].classes_, k=3)
        sub_intent_top3 = self._get_top_k(sub_intent_probs, self.encoders['sub_intent'].classes_, k=3)
        timeframe_top3 = self._get_top_k(timeframe_probs, self.encoders['timeframe'].classes_, k=3)
        
        # Return Intent type matching types.ts
        return {
            'intent': intent,
            'sub_intent': sub_intent,
            'timeframe': timeframe_type,
            'start': start.to_iso8601_string(),
            'end': end.to_iso8601_string(),
            'forecast_type': forecast_type,
            'confidence': confidence,
            # Additional details for display
            'day_offset': day_offset,
            'hour_of_day': hour_of_day,
            'day_duration': day_duration,
            'hour_duration': hour_duration,
            'intent_top3': intent_top3,
            'sub_intent_top3': sub_intent_top3,
            'timeframe_top3': timeframe_top3,
            'tokens': input_ids[:10]  # First 10 tokens for debugging
        }
    
    def _softmax(self, x):
        """Compute softmax"""
        exp_x = np.exp(x - np.max(x))
        return exp_x / exp_x.sum()
    
    def _get_top_k(self, probs, classes, k=3):
        """Get top-k predictions with probabilities"""
        top_k_idx = np.argsort(probs)[-k:][::-1]
        return [(classes[idx], probs[idx]) for idx in top_k_idx]
    
    def format_duration(self, day_duration, hour_duration):
        """Format duration in human-readable format"""
        if day_duration > 0:
            return f"{day_duration} day{'s' if day_duration != 1 else ''}"
        elif hour_duration < 1:
            return "< 1 hour"
        else:
            return f"{hour_duration} hour{'s' if hour_duration != 1 else ''}"
    
    def display_result(self, query, result):
        """Display prediction results in a beautiful format"""
        print(f"\n{Fore.CYAN}{'='*70}")
        print(f"{Fore.CYAN}📊 PREDICTION RESULTS")
        print(f"{Fore.CYAN}{'='*70}\n")
        
        print(f"{Fore.WHITE}Query: {Fore.YELLOW}\"{query}\"")
        print(f"{Fore.WHITE}Model Confidence: {self._get_confidence_color(result['confidence'])}{result['confidence']*100:.1f}%{Style.RESET_ALL}\n")
        
        # Main predictions
        print(f"{Fore.GREEN}┌─ Main Classification")
        print(f"{Fore.GREEN}│")
        print(f"{Fore.GREEN}├─ {Fore.WHITE}Intent:         {Fore.CYAN}{result['intent']}")
        print(f"{Fore.GREEN}├─ {Fore.WHITE}Sub-Intent:     {Fore.CYAN}{result['sub_intent']}")
        print(f"{Fore.GREEN}├─ {Fore.WHITE}Timeframe:      {Fore.CYAN}{result['timeframe']}")
        print(f"{Fore.GREEN}└─ {Fore.WHITE}Forecast Type:  {Fore.CYAN}{result['forecast_type']}\n")
        
        # Enhanced temporal details
        start = pendulum.parse(result['start'])
        end = pendulum.parse(result['end'])
        
        print(f"{Fore.MAGENTA}┌─ Temporal Details (Enhanced)")
        print(f"{Fore.MAGENTA}│")
        print(f"{Fore.MAGENTA}├─ {Fore.WHITE}Day Offset:    {Fore.YELLOW}{result['day_offset']} day{'s' if result['day_offset'] != 1 else ''} from now")
        print(f"{Fore.MAGENTA}├─ {Fore.WHITE}Hour of Day:   {Fore.YELLOW}{result['hour_of_day']:02d}:00 (24h format)")
        print(f"{Fore.MAGENTA}├─ {Fore.WHITE}Day Duration:  {Fore.YELLOW}{result['day_duration']} day{'s' if result['day_duration'] != 1 else ''}")
        print(f"{Fore.MAGENTA}├─ {Fore.WHITE}Hour Duration: {Fore.YELLOW}{result['hour_duration']} hour{'s' if result['hour_duration'] != 1 else ''}")
        print(f"{Fore.MAGENTA}│")
        print(f"{Fore.MAGENTA}├─ {Fore.WHITE}Start Time:    {Fore.YELLOW}{start.format('dddd, MMMM D, YYYY [at] h:mm A')}")
        print(f"{Fore.MAGENTA}└─ {Fore.WHITE}End Time:      {Fore.YELLOW}{end.format('dddd, MMMM D, YYYY [at] h:mm A')}\n")
        
        # Duration summary
        duration_str = self.format_duration(result['day_duration'], result['hour_duration'])
        print(f"{Fore.BLUE}⏱  Duration: {duration_str}\n")
        
        # Top predictions
        print(f"{Fore.BLUE}┌─ Alternative Predictions (Top 3)")
        print(f"{Fore.BLUE}│")
        print(f"{Fore.BLUE}├─ {Fore.WHITE}Intent:")
        for i, (cls, prob) in enumerate(result['intent_top3'], 1):
            bar = self._create_bar(prob)
            print(f"{Fore.BLUE}│  {i}. {cls:20s} {bar} {prob*100:5.1f}%")
        
        print(f"{Fore.BLUE}│")
        print(f"{Fore.BLUE}├─ {Fore.WHITE}Sub-Intent:")
        for i, (cls, prob) in enumerate(result['sub_intent_top3'], 1):
            bar = self._create_bar(prob)
            print(f"{Fore.BLUE}│  {i}. {cls:20s} {bar} {prob*100:5.1f}%")
        
        print(f"{Fore.BLUE}│")
        print(f"{Fore.BLUE}├─ {Fore.WHITE}Timeframe:")
        for i, (cls, prob) in enumerate(result['timeframe_top3'], 1):
            bar = self._create_bar(prob)
            print(f"{Fore.BLUE}│  {i}. {cls:20s} {bar} {prob*100:5.1f}%")
        
        print(f"{Fore.BLUE}└─")
        
        # Debug info
        print(f"\n{Fore.WHITE}{Style.DIM}Debug: First 10 token IDs: {result['tokens']}{Style.RESET_ALL}")
        
        print(f"\n{Fore.CYAN}{'='*70}\n")
    
    def _get_confidence_color(self, confidence):
        """Get color based on confidence level"""
        if confidence >= 0.8:
            return Fore.GREEN
        elif confidence >= 0.6:
            return Fore.YELLOW
        else:
            return Fore.RED
    
    def _create_bar(self, prob, width=20):
        """Create a visual bar for probability"""
        filled = int(prob * width)
        bar = '█' * filled + '░' * (width - filled)
        return f"{Fore.CYAN}{bar}{Style.RESET_ALL}"
    
    def run_examples(self):
        """Run a set of example queries"""
        examples = [
            "will it rain tomorrow?",
            "what is the temperature today?",
            "is it windy this weekend?",
            "show me the forecast for next week",
            "how hot will it be at 3pm tomorrow?",
            "any storm alerts today?",
            "when is the sunset?",
            "is it good for hiking this weekend?",
            "will it snow on Monday?",
            "what's the humidity tonight?",
            "temperature tomorrow at noon",
            "rain forecast for the next 3 hours",
            "weather this evening",
            "will there be precipitation from Friday to Sunday?",
        ]
        
        print(f"{Fore.YELLOW}Running example queries...\n")
        
        for i, query in enumerate(examples, 1):
            print(f"{Fore.WHITE}{Back.BLUE} Example {i}/{len(examples)} {Style.RESET_ALL}")
            result = self.predict(query)
            self.display_result(query, result)
            
            if i < len(examples):
                input(f"{Fore.WHITE}Press Enter to continue...{Style.RESET_ALL}")
                print("\n")
    
    def run_interactive(self):
        """Run interactive mode"""
        print(f"{Fore.GREEN}🎮 Interactive Mode - Enter queries to test the model")
        print(f"{Fore.GREEN}Commands: 'examples' to run examples, 'quit' to exit\n")
        
        while True:
            try:
                query = input(f"{Fore.YELLOW}Query > {Style.RESET_ALL}").strip()
                
                if not query:
                    continue
                
                if query.lower() in ['quit', 'exit', 'q']:
                    print(f"{Fore.CYAN}Goodbye! 👋")
                    break
                
                if query.lower() == 'examples':
                    self.run_examples()
                    continue
                
                # Run prediction
                result = self.predict(query)
                self.display_result(query, result)
                
            except KeyboardInterrupt:
                print(f"\n{Fore.CYAN}Goodbye! 👋")
                break
            except Exception as e:
                print(f"{Fore.RED}❌ Error: {str(e)}")

def main():
    import argparse
    
    parser = argparse.ArgumentParser(description='Interactive Weather Intent Model Tester v2.0')
    parser.add_argument('--pytorch', action='store_true', help='Use PyTorch model instead of ONNX')
    parser.add_argument('--examples', action='store_true', help='Run example queries and exit')
    parser.add_argument('--query', type=str, help='Run a single query and exit')
    
    args = parser.parse_args()
    
    # Create tester
    tester = InteractiveModelTester(use_onnx=not args.pytorch)
    
    if args.query:
        # Single query mode
        result = tester.predict(args.query)
        tester.display_result(args.query, result)
    elif args.examples:
        # Examples mode
        tester.run_examples()
    else:
        # Interactive mode
        tester.run_interactive()

if __name__ == "__main__":
    main()