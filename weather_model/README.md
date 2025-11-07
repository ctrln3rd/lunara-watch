# Weather Intent Classification System 🧠⚡

A super-intelligent intent classification system for weather queries using ONNX models deployed to the browser.

## 🎯 Features

- **Multi-task Classification**: Simultaneously predicts intent, sub-intent, timeframe type, forecast type, duration, and confidence
- **Browser-based Inference**: Runs entirely in the browser using ONNX Runtime Web (no server needed!)
- **Smart Caching**: Automatically caches models in localStorage with version management
- **Rich Time Understanding**: Leverages Luxon for sophisticated time parsing and formatting
- **Extensible**: Easy to update keywords and retrain without code changes

## 📊 Model Outputs

The model produces 6 outputs:
1. **intent_logits**: Main intent (temperature, precipitation, wind, etc.)
2. **sub_intent_logits**: Specific detail (rain, snow, hot, cold, etc.)
3. **timeframe_logits**: When the query applies (today, tomorrow, this week, etc.)
4. **forecast_logits**: What granularity needed (hourly, daily, all)
5. **duration_normalized**: How long the timeframe spans (in hours, normalized 0-1)
6. **confidence**: Model confidence score (0-1)

## 🏗️ Architecture

### Backend (Python)
- **PyTorch** for model architecture
- **Pendulum** for intelligent time handling
- **ONNX** for model export
- **scikit-learn** for preprocessing

### Frontend (TypeScript/Next.js)
- **ONNX Runtime Web** for inference
- **Luxon** for time manipulation
- **Next.js 15** with TypeScript
- **Tailwind CSS** for styling

## 📁 Project Structure

```
weather-intent-model/
├── backend/
│   ├── intent_keywords.json          # Intent definitions (editable!)
│   ├── timeframe_keywords.json       # Timeframe definitions (editable!)
│   ├── generate_training_data.py     # Synthetic data generation
│   ├── preprocess_data.py            # Data preprocessing
│   ├── model.py                      # PyTorch model architecture
│   ├── train.py                      # Training script
│   ├── export_onnx.py                # ONNX export script
│   └── types.ts                      # Type definitions (reference)
│
├── frontend/
│   ├── IntentProcessor.ts            # Main inference class
│   ├── useIntentProcessor.ts         # React hook
│   ├── IntentFormatter.ts            # Result formatting utilities
│   ├── IntentDemo.tsx                # Demo component
│   └── types.ts                      # TypeScript types
│
└── model_artifacts/
    ├── intent_model.onnx             # Exported ONNX model
    ├── vocabulary.json               # Token vocabulary
    ├── frontend_metadata.json        # Model metadata for frontend
    └── model_metadata.json           # Training metadata
```

## 🚀 Quick Start

### Backend Setup

```bash
# Automated setup (recommended)
chmod +x setup_and_train.sh
./setup_and_train.sh

# Or manual setup
pip install torch pendulum pandas scikit-learn onnx onnxruntime numpy matplotlib colorama

# 1. Generate training data
python generate_training_data.py

# 2. Preprocess data
python preprocess_data.py

# 3. Train model
python train.py

# 4. Export to ONNX
python export_onnx.py

# 5. Test the model
python test_model_interactive.py
```

### 🧪 Interactive Testing

After training, test your model with the interactive tester:

```bash
# Interactive mode - type queries and see results
python test_model_interactive.py

# Run example queries
python test_model_interactive.py --examples

# Test a single query
python test_model_interactive.py --query "will it rain tomorrow?"

# Use PyTorch model instead of ONNX
python test_model_interactive.py --pytorch

# Quick validation test
python quick_test.py
```

**Interactive Mode Commands:**
- Type any weather query to get predictions
- `examples` - Run predefined example queries
- `quit` or `exit` - Exit the program

### Frontend Setup

```bash
# Install dependencies
npm install onnxruntime-web luxon
npm install --save-dev @types/luxon

# Copy model files to public directory
mkdir -p public/models
cp model_artifacts/intent_model.onnx public/models/
cp model_artifacts/vocabulary.json public/models/
cp model_artifacts/frontend_metadata.json public/models/

# Use the IntentDemo component in your app
```

## 💡 Usage Examples

### Basic Usage

```typescript
import { IntentProcessor } from './IntentProcessor';
import { IntentFormatter } from './IntentFormatter';

const processor = new IntentProcessor();
await processor.initialize(
  '/models/intent_model.onnx',
  '/models/vocabulary.json',
  '/models/frontend_metadata.json',
  '1.0.0'
);

const result = await processor.predict('will it rain tomorrow?');
console.log(IntentFormatter.formatIntent(result));
// Output: "Precipitation - Rain for tomorrow"
```

### React Hook Usage

```tsx
import { useIntentProcessor } from './useIntentProcessor';

function MyComponent() {
  const { predict, isLoading, isInitialized } = useIntentProcessor({
    modelUrl: '/models/intent_model.onnx',
    vocabUrl: '/models/vocabulary.json',
    metadataUrl: '/models/frontend_metadata.json',
    version: '1.0.0'
  });

  const handleQuery = async (query: string) => {
    const result = await predict(query);
    console.log(result);
  };

  return <div>...</div>;
}
```

## 🎨 Customization

### Adding New Keywords

Edit `intent_keywords.json` or `timeframe_keywords.json`:

```json
{
  "intent": "temperature",
  "keywords": ["hot", "cold", "warm", "temperature"],
  "sub_intents": [
    {
      "name": "hot",
      "keywords": ["hot", "heat", "warm", "scorching"]
    }
  ]
}
```

Then regenerate training data and retrain:

```bash
python generate_training_data.py
python preprocess_data.py
python train.py
python export_onnx.py
```

### Model Version Updates

When you update the model:

1. Change version in `export_onnx.py`
2. Export new model
3. Update version in frontend config
4. Browser will automatically download and cache new version

## 📈 Training Metrics

The training script tracks:
- Intent accuracy
- Sub-intent accuracy
- Timeframe accuracy
- Forecast accuracy
- Duration regression loss
- Overall confidence

Training history is saved as `training_history.png`.

## 🔧 Model Architecture

```
Input (Tokenized Query)
    ↓
Embedding Layer (128 dim)
    ↓
Bidirectional LSTM (2 layers, 256 hidden)
    ↓
Attention Mechanism
    ↓
Shared Feature Extractor
    ↓
├─→ Intent Head
├─→ Sub-Intent Head
├─→ Timeframe Head
├─→ Forecast Head
├─→ Duration Head (Regression)
└─→ Confidence Head
```

## 🎯 Supported Intents

- **Weather Conditions**: precipitation, temperature, wind, cloud, visibility
- **Atmospheric**: humidity, pressure, UV index
- **Celestial**: sun (rise/set), moon (phase/rise/set)
- **Safety**: alerts, warnings, advisories
- **Planning**: activity recommendations
- **Conversation**: greetings, feedback, farewell
- **General**: overall weather queries

## 🌟 Advanced Features

### Smart Time Parsing
The system understands complex time expressions:
- "tomorrow at 3pm"
- "this weekend"
- "next week"
- "in the next few hours"
- "from Monday to Friday"

### Confidence Scoring
The model provides confidence scores to help handle ambiguous queries gracefully.

### Duration Prediction
Automatically determines appropriate time spans for queries (1 hour to 1 week).

### Forecast Type Selection
Intelligently chooses between hourly, daily, or combined forecasts based on the query.

## 🐛 Debugging

Enable verbose logging:

```typescript
// In IntentProcessor.ts
console.log('Token IDs:', inputIds);
console.log('Model outputs:', results);
```

Check model metadata:

```typescript
const info = processor.getModelInfo();
console.log(info);
```

## 📝 License

MIT License - feel free to use in your projects!

## 🤝 Contributing

1. Update keyword files for better coverage
2. Generate more training data
3. Improve model architecture
4. Add more time parsing logic
5. Enhance UI/UX in demo component

## 🎓 Learn More

- [ONNX Runtime Web Docs](https://onnxruntime.ai/docs/tutorials/web/)
- [PyTorch ONNX Export](https://pytorch.org/docs/stable/onnx.html)
- [Luxon Time Library](https://moment.github.io/luxon/)
- [Pendulum Python Time](https://pendulum.eustace.io/)

---

Built with ❤️ for super-intelligent weather conversations! 🌤️🧠