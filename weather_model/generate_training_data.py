import json
import csv
import random
from datetime import datetime, timedelta
from typing import List, Dict, Tuple
import pendulum
from config import INTENT_KEYWORDS, TIMEFRAME_KEYWORDS, BASE_DIR

def load_keywords():
    """Load intent and timeframe keywords from JSON files"""
    with open(INTENT_KEYWORDS, 'r') as f:
        intent_data = json.load(f)
    with open(TIMEFRAME_KEYWORDS, 'r') as f:
        timeframe_data = json.load(f)
    return intent_data, timeframe_data

def generate_timeframe_labels(query: str, timeframe_data: dict) -> Tuple[str, int, int, int, int]:
    """
    Generate enhanced timeframe labels
    Returns: (timeframe_type, day_offset, hour_of_day, day_duration, hour_duration)
    
    day_offset: 0-6 (which day from now)
    hour_of_day: 0-23 (specific hour)
    day_duration: 0-7 (number of days)
    hour_duration: 1-168 (total hours)
    """
    now = pendulum.now()
    
    # Default values
    day_offset = 0
    hour_of_day = now.hour
    day_duration = 1
    hour_duration = 24
    timeframe_type = 'none'
    
    # Check each timeframe type
    for tf in timeframe_data['timeframes']:
        tf_type = tf['type']
        for keyword in tf['keywords']:
            if keyword.lower() in query.lower():
                timeframe_type = tf_type
                
                if tf_type == 'absolute_day':
                    if 'today' in keyword:
                        day_offset = 0
                        hour_of_day = 12  # Noon as default
                        day_duration = 1
                        hour_duration = 24
                    elif 'tomorrow' in keyword:
                        day_offset = 1
                        hour_of_day = 12
                        day_duration = 1
                        hour_duration = 24
                    elif 'yesterday' in keyword:
                        day_offset = 0  # Treat as today for training
                        hour_of_day = 12
                        day_duration = 1
                        hour_duration = 24
                    elif 'day after tomorrow' in keyword:
                        day_offset = 2
                        hour_of_day = 12
                        day_duration = 1
                        hour_duration = 24
                    elif any(day in keyword for day in ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']):
                        # Find next occurrence of that day
                        days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
                        for day in days:
                            if day in keyword:
                                target_day = days.index(day)
                                current_day = now.day_of_week - 1
                                days_ahead = (target_day - current_day) % 7
                                if days_ahead == 0:
                                    if 'next' in keyword:
                                        days_ahead = 7
                                    elif 'last' in keyword:
                                        days_ahead = 0
                                day_offset = min(days_ahead, 6)
                                hour_of_day = 12
                                day_duration = 1
                                hour_duration = 24
                                break
                
                elif tf_type == 'relative_day':
                    if 'this week' in keyword:
                        day_offset = 0
                        hour_of_day = 12
                        day_duration = 7
                        hour_duration = 168
                    elif 'next week' in keyword:
                        day_offset = 7 % 7  # Capped at 6
                        hour_of_day = 12
                        day_duration = 7
                        hour_duration = 168
                    elif 'weekend' in keyword:
                        # Days until Saturday
                        current_day = now.day_of_week - 1
                        days_until_sat = (5 - current_day) % 7
                        if days_until_sat == 0 and now.hour > 12:
                            days_until_sat = 7
                        day_offset = min(days_until_sat, 6)
                        hour_of_day = 12
                        day_duration = 2
                        hour_duration = 48
                    elif 'next few days' in keyword or 'few days' in keyword or 'couple days' in keyword:
                        day_offset = 0
                        hour_of_day = 12
                        day_duration = 3
                        hour_duration = 72
                    elif 'rest of the week' in keyword or 'end of the week' in keyword:
                        current_day = now.day_of_week - 1
                        days_left = 6 - current_day
                        day_offset = 0
                        hour_of_day = 12
                        day_duration = min(days_left, 7)
                        hour_duration = days_left * 24
                    else:
                        day_offset = 0
                        hour_of_day = 12
                        day_duration = 7
                        hour_duration = 168
                
                elif tf_type == 'absolute_time':
                    # Extract hour from keyword
                    import re
                    
                    if 'noon' in keyword or '12:00' in keyword or '12 o' in keyword:
                        day_offset = 0
                        hour_of_day = 12
                        day_duration = 0
                        hour_duration = 1
                    elif 'midnight' in keyword:
                        day_offset = 1
                        hour_of_day = 0
                        day_duration = 0
                        hour_duration = 1
                    else:
                        # Try to extract hour number
                        hour_match = re.search(r'(\d{1,2})\s*(am|pm|:)', keyword.lower())
                        if hour_match:
                            hour = int(hour_match.group(1))
                            if 'pm' in keyword.lower() and hour != 12:
                                hour += 12
                            elif 'am' in keyword.lower() and hour == 12:
                                hour = 0
                            
                            # Determine if it's today or tomorrow
                            if hour < now.hour:
                                day_offset = 1
                            else:
                                day_offset = 0
                            
                            hour_of_day = hour
                            day_duration = 0
                            hour_duration = 1
                        else:
                            day_offset = 0
                            hour_of_day = now.hour
                            day_duration = 0
                            hour_duration = 1
                
                elif tf_type == 'relative_time':
                    if 'next hour' in keyword or 'in the next hour' in keyword:
                        day_offset = 0
                        hour_of_day = now.hour
                        day_duration = 0
                        hour_duration = 1
                    elif 'next 3 hours' in keyword or 'next few hours' in keyword or 'couple hours' in keyword:
                        day_offset = 0
                        hour_of_day = now.hour
                        day_duration = 0
                        hour_duration = 3
                    elif 'tonight' in keyword:
                        day_offset = 0
                        hour_of_day = 20  # 8 PM
                        day_duration = 0
                        hour_duration = 6
                    elif 'this morning' in keyword or 'morning' in keyword or 'early morning' in keyword:
                        day_offset = 0
                        hour_of_day = 7
                        day_duration = 0
                        hour_duration = 5  # 7-12
                    elif 'afternoon' in keyword or 'this afternoon' in keyword:
                        day_offset = 0
                        hour_of_day = 14
                        day_duration = 0
                        hour_duration = 5  # 12-17
                    elif 'evening' in keyword or 'this evening' in keyword:
                        day_offset = 0
                        hour_of_day = 18
                        day_duration = 0
                        hour_duration = 4  # 18-22
                    elif 'later today' in keyword:
                        day_offset = 0
                        hour_of_day = min(now.hour + 3, 23)
                        day_duration = 0
                        hour_duration = 6
                    elif 'overnight' in keyword:
                        day_offset = 0
                        hour_of_day = 22
                        day_duration = 0
                        hour_duration = 8
                    else:
                        day_offset = 0
                        hour_of_day = now.hour
                        day_duration = 0
                        hour_duration = 3
                
                else:  # none
                    day_offset = 0
                    hour_of_day = now.hour
                    day_duration = 1
                    hour_duration = 24
                
                return timeframe_type, day_offset, hour_of_day, day_duration, hour_duration
    
    # Default if no match
    return 'none', 0, now.hour, 1, 24

def generate_forecast_type(day_duration: int, hour_duration: int) -> str:
    """Determine forecast type based on duration"""
    if day_duration == 0 and hour_duration <= 6:
        return 'hourly'
    elif day_duration <= 2 or hour_duration <= 48:
        return 'all'  # both hourly and daily useful
    else:
        return 'daily'

def generate_synthetic_queries(intent_data: dict, timeframe_data: dict, count: int = 8000) -> List[Dict]:
    """Generate comprehensive synthetic training data"""
    training_data = []
    
    # Query templates for variety
    templates = [
        "{keyword} {timeframe}",
        "what is the {keyword} {timeframe}",
        "will there be {keyword} {timeframe}",
        "how {keyword} will it be {timeframe}",
        "{keyword} forecast {timeframe}",
        "is it going to {keyword} {timeframe}",
        "check {keyword} {timeframe}",
        "show me {keyword} for {timeframe}",
        "tell me about {keyword} {timeframe}",
        "what's the {keyword} like {timeframe}",
        "give me the {keyword} {timeframe}",
        "any {keyword} {timeframe}",
        "will it {keyword} {timeframe}",
        "is there {keyword} {timeframe}",
        "{timeframe} {keyword}",
        "{keyword} {timeframe} please",
        "can you check {keyword} {timeframe}",
        "I want to know the {keyword} {timeframe}",
    ]
    
    for _ in range(count):
        # Pick a random intent
        intent_obj = random.choice(intent_data['intents'])
        intent = intent_obj['intent']
        
        # Skip non-weather intents for most synthetic data
        if intent in ['greetings', 'feedback', 'farewell', 'unknown'] and random.random() < 0.8:
            continue
        
        # Pick sub_intent if available
        sub_intent = 'none'
        if 'sub_intents' in intent_obj and intent_obj['sub_intents'] and random.random() > 0.2:
            sub_intent_obj = random.choice(intent_obj['sub_intents'])
            sub_intent = sub_intent_obj['name']
            keyword = random.choice(sub_intent_obj['keywords'])
        else:
            keyword = random.choice(intent_obj['keywords']) if intent_obj['keywords'] else intent
        
        # Pick a timeframe
        timeframe_obj = random.choice(timeframe_data['timeframes'])
        tf_keyword = random.choice(timeframe_obj['keywords'])
        
        # Generate query variation
        template = random.choice(templates)
        query = template.format(keyword=keyword, timeframe=tf_keyword)
        
        # Generate timeframe labels
        timeframe_type, day_offset, hour_of_day, day_duration, hour_duration = generate_timeframe_labels(query, timeframe_data)
        forecast_type = generate_forecast_type(day_duration, hour_duration)
        
        training_data.append({
            'query': query,
            'intent': intent,
            'sub_intent': sub_intent,
            'timeframe_type': timeframe_type,
            'day_offset': day_offset,
            'hour_of_day': hour_of_day,
            'day_duration': day_duration,
            'hour_duration': hour_duration,
            'forecast_type': forecast_type
        })
    
    # Add examples from JSON with proper timeframe handling
    for intent_obj in intent_data['intents']:
        for example in intent_obj.get('examples', []):
            timeframe_type, day_offset, hour_of_day, day_duration, hour_duration = generate_timeframe_labels(example, timeframe_data)
            forecast_type = generate_forecast_type(day_duration, hour_duration)
            
            # Try to detect sub_intent from example
            sub_intent = 'none'
            if 'sub_intents' in intent_obj and intent_obj['sub_intents']:
                for sub_intent_obj in intent_obj['sub_intents']:
                    for kw in sub_intent_obj['keywords']:
                        if kw.lower() in example.lower():
                            sub_intent = sub_intent_obj['name']
                            break
                    if sub_intent != 'none':
                        break
            
            training_data.append({
                'query': example,
                'intent': intent_obj['intent'],
                'sub_intent': sub_intent,
                'timeframe_type': timeframe_type,
                'day_offset': day_offset,
                'hour_of_day': hour_of_day,
                'day_duration': day_duration,
                'hour_duration': hour_duration,
                'forecast_type': forecast_type
            })
    
    # Add edge cases and complex queries
    edge_cases = [
        ("will it rain tomorrow at 3pm", "precipitation", "rain", "absolute_time", 1, 15, 0, 1, "hourly"),
        ("what's the temperature this weekend", "temperature", "none", "relative_day", 5, 12, 2, 48, "all"),
        ("is it going to snow next monday morning", "precipitation", "snow", "absolute_day", 7 % 7, 7, 0, 5, "hourly"),
        ("humidity levels tonight", "humidity", "none", "relative_time", 0, 20, 0, 6, "hourly"),
        ("will there be storms this week", "alerts", "storm", "relative_day", 0, 12, 7, 168, "daily"),
        ("temperature from monday to friday", "temperature", "none", "relative_day", 0, 12, 5, 120, "daily"),
        ("wind speed in the next 3 hours", "wind", "speed", "relative_time", 0, pendulum.now().hour, 0, 3, "hourly"),
    ]
    
    for query, intent, sub_intent, tf_type, day_off, hour, day_dur, hour_dur, forecast in edge_cases:
        training_data.append({
            'query': query,
            'intent': intent,
            'sub_intent': sub_intent,
            'timeframe_type': tf_type,
            'day_offset': day_off,
            'hour_of_day': hour,
            'day_duration': day_dur,
            'hour_duration': hour_dur,
            'forecast_type': forecast
        })
    
    return training_data

def save_training_data(data: List[Dict], filename: str = BASE_DIR/'training_data.csv'):
    """Save training data to CSV"""
    with open(filename, 'w', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=[
            'query', 'intent', 'sub_intent', 'timeframe_type', 
            'day_offset', 'hour_of_day', 'day_duration', 'hour_duration', 'forecast_type'
        ])
        writer.writeheader()
        writer.writerows(data)
    print(f"Saved {len(data)} training examples to {filename}")

if __name__ == "__main__":
    intent_data, timeframe_data = load_keywords()
    training_data = generate_synthetic_queries(intent_data, timeframe_data, count=8000)
    save_training_data(training_data)
    
    # Print statistics
    print("\n=== Training Data Statistics ===")
    print(f"Total samples: {len(training_data)}")
    
    intents = {}
    timeframes = {}
    for item in training_data:
        intents[item['intent']] = intents.get(item['intent'], 0) + 1
        timeframes[item['timeframe_type']] = timeframes.get(item['timeframe_type'], 0) + 1
    
    print(f"\nIntent distribution:")
    for intent, count in sorted(intents.items(), key=lambda x: x[1], reverse=True):
        print(f"  {intent}: {count}")
    
    print(f"\nTimeframe distribution:")
    for tf, count in sorted(timeframes.items(), key=lambda x: x[1], reverse=True):
        print(f"  {tf}: {count}")
    
    # Print sample
    print("\n=== Sample training data ===")
    for item in random.sample(training_data, min(5, len(training_data))):
        print(f"\nQuery: {item['query']}")
        print(f"  Intent: {item['intent']} | Sub: {item['sub_intent']}")
        print(f"  Timeframe: {item['timeframe_type']}")
        print(f"  Day offset: {item['day_offset']} | Hour: {item['hour_of_day']}")
        print(f"  Duration: {item['day_duration']}d {item['hour_duration']}h")
        print(f"  Forecast: {item['forecast_type']}")