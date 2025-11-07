import torch
import onnx
import onnxruntime as ort
import json
import numpy as np
from model import create_model
from config import BASE_DIR

def export_to_onnx(model, vocab_size, max_length=50, output_path=BASE_DIR/'model_artifacts/intent_model.onnx'):
    """Export PyTorch model to ONNX format"""
    model.eval()
    
    # Create dummy input
    dummy_input = torch.randint(0, vocab_size, (1, max_length), dtype=torch.long)
    
    # Export
    torch.onnx.export(
        model,
        dummy_input,
        output_path,
        export_params=True,
        opset_version=14,
        do_constant_folding=True,
        input_names=['input_ids'],
        output_names=[
            'intent_logits',
            'sub_intent_logits',
            'timeframe_logits',
            'forecast_logits',
            'day_offset',
            'hour_of_day',
            'day_duration',
            'hour_duration',
            'confidence'
        ],
        dynamic_axes={
            'input_ids': {0: 'batch_size'},
            'intent_logits': {0: 'batch_size'},
            'sub_intent_logits': {0: 'batch_size'},
            'timeframe_logits': {0: 'batch_size'},
            'forecast_logits': {0: 'batch_size'},
            'day_offset': {0: 'batch_size'},
            'hour_of_day': {0: 'batch_size'},
            'day_duration': {0: 'batch_size'},
            'hour_duration': {0: 'batch_size'},
            'confidence': {0: 'batch_size'}
        }
    )
    
    print(f"Exported model to {output_path}")
    
    # Verify ONNX model
    onnx_model = onnx.load(output_path)
    onnx.checker.check_model(onnx_model)
    print("ONNX model is valid!")
    
    # Add metadata
    onnx_model.metadata_props.append(
        onnx.StringStringEntryProto(key='model_version', value='2.0.0')
    )
    onnx_model.metadata_props.append(
        onnx.StringStringEntryProto(key='model_type', value='intent_classifier_v2')
    )
    onnx_model.metadata_props.append(
        onnx.StringStringEntryProto(key='max_length', value=str(max_length))
    )
    
    onnx.save(onnx_model, output_path)
    print("Added metadata to ONNX model")
    
    return output_path

def verify_onnx_model(onnx_path, vocab_size, max_length=50):
    """Test ONNX model with ONNX Runtime"""
    print("\n=== Verifying ONNX Model ===")
    
    # Create session
    session = ort.InferenceSession(onnx_path, providers=['CPUExecutionProvider'])
    
    # Check inputs/outputs
    print("\nInputs:")
    for inp in session.get_inputs():
        print(f"  {inp.name}: {inp.shape} ({inp.type})")
    
    print("\nOutputs:")
    for out in session.get_outputs():
        print(f"  {out.name}: {out.shape} ({out.type})")
    
    # Test inference
    test_input = np.random.randint(0, vocab_size, (1, max_length), dtype=np.int64)
    
    outputs = session.run(None, {'input_ids': test_input})
    
    print("\n=== Test Inference ===")
    output_names = [
        'intent_logits', 'sub_intent_logits', 'timeframe_logits',
        'forecast_logits', 'day_offset', 'hour_of_day', 
        'day_duration', 'hour_duration', 'confidence'
    ]
    
    for name, output in zip(output_names, outputs):
        print(f"{name}: shape={output.shape}, dtype={output.dtype}")
        if 'logits' in name:
            probs = torch.softmax(torch.tensor(output), dim=1).numpy()
            pred = np.argmax(probs, axis=1)[0]
            conf = probs[0, pred]
            print(f"  → Predicted class: {pred}, confidence: {conf:.4f}")
        else:
            print(f"  → Value: {output[0, 0]:.4f}")
    
    print("\n✓ ONNX model verification successful!")

def create_frontend_metadata(metadata_path=BASE_DIR/'model_artifacts/model_metadata.json',
                            output_path=BASE_DIR/'model_artifacts/frontend_metadata.json'):
    """Create comprehensive metadata for frontend"""
    
    with open(metadata_path, 'r') as f:
        metadata = json.load(f)
    
    # Add additional info for frontend
    frontend_metadata = {
        'version': '2.0.0',
        'model_file': 'intent_model.onnx',
        'vocab_size': metadata['vocab_size'],
        'max_length': metadata['max_length'],
        
        'inputs': {
            'input_ids': {
                'name': 'input_ids',
                'type': 'int64',
                'shape': [1, metadata['max_length']],
                'description': 'Tokenized input query (padded/truncated to max_length)'
            }
        },
        
        'outputs': {
            'intent_logits': {
                'name': 'intent_logits',
                'type': 'float32',
                'shape': [1, len(metadata['intent_classes'])],
                'classes': metadata['intent_classes'],
                'description': 'Logits for main intent classification'
            },
            'sub_intent_logits': {
                'name': 'sub_intent_logits',
                'type': 'float32',
                'shape': [1, len(metadata['sub_intent_classes'])],
                'classes': metadata['sub_intent_classes'],
                'description': 'Logits for sub-intent classification'
            },
            'timeframe_logits': {
                'name': 'timeframe_logits',
                'type': 'float32',
                'shape': [1, len(metadata['timeframe_classes'])],
                'classes': metadata['timeframe_classes'],
                'description': 'Logits for timeframe type classification'
            },
            'forecast_logits': {
                'name': 'forecast_logits',
                'type': 'float32',
                'shape': [1, len(metadata['forecast_classes'])],
                'classes': metadata['forecast_classes'],
                'description': 'Logits for forecast type classification'
            },
            'day_offset': {
                'name': 'day_offset',
                'type': 'float32',
                'shape': [1, 1],
                'range': [0, 1],
                'denormalized_range': [0, 6],
                'description': 'Days from now (0=today, 1=tomorrow, etc.)',
                'denormalize_formula': 'Math.round(normalized * 6)'
            },
            'hour_of_day': {
                'name': 'hour_of_day',
                'type': 'float32',
                'shape': [1, 1],
                'range': [0, 1],
                'denormalized_range': [0, 23],
                'description': 'Hour within the day (24-hour format)',
                'denormalize_formula': 'Math.round(normalized * 23)'
            },
            'day_duration': {
                'name': 'day_duration',
                'type': 'float32',
                'shape': [1, 1],
                'range': [0, 1],
                'denormalized_range': [0, 7],
                'description': 'Number of days in the timeframe',
                'denormalize_formula': 'Math.round(normalized * 7)'
            },
            'hour_duration': {
                'name': 'hour_duration',
                'type': 'float32',
                'shape': [1, 1],
                'range': [0, 1],
                'denormalized_range': [0, 168],
                'description': 'Total hours in the timeframe',
                'denormalize_formula': 'Math.round(normalized * 168)'
            },
            'confidence': {
                'name': 'confidence',
                'type': 'float32',
                'shape': [1, 1],
                'range': [0, 1],
                'description': 'Model confidence score (0-1)'
            }
        },
        
        'temporal_normalization': metadata['temporal_normalization'],
        
        'usage_example': {
            'query': 'will it rain tomorrow at 3pm?',
            'expected_output': {
                'intent': 'precipitation',
                'sub_intent': 'rain',
                'timeframe_type': 'absolute_time',
                'forecast_type': 'hourly',
                'day_offset': 1,
                'hour_of_day': 15,
                'day_duration': 0,
                'hour_duration': 1,
                'confidence': 0.95
            }
        }
    }
    
    with open(output_path, 'w') as f:
        json.dump(frontend_metadata, f, indent=2)
    
    print(f"\nCreated frontend metadata at {output_path}")

def main():
    # Load metadata
    with open(BASE_DIR/'model_artifacts/model_metadata.json', 'r') as f:
        metadata = json.load(f)
    
    # Create model
    model = create_model(
        vocab_size=metadata['vocab_size'],
        num_intent=len(metadata['intent_classes']),
        num_sub_intent=len(metadata['sub_intent_classes']),
        num_timeframe=len(metadata['timeframe_classes']),
        num_forecast=len(metadata['forecast_classes'])
    )
    
    # Load trained weights
    model.load_state_dict(torch.load('best_model.pt', map_location='cpu'))
    print("Loaded trained model weights")
    
    # Export to ONNX
    onnx_path = export_to_onnx(
        model,
        vocab_size=metadata['vocab_size'],
        max_length=metadata['max_length'],
        output_path=BASE_DIR/'model_artifacts/intent_model.onnx'
    )
    
    # Verify ONNX model
    verify_onnx_model(onnx_path, metadata['vocab_size'], metadata['max_length'])
    
    # Create frontend metadata
    create_frontend_metadata()
    
    print("\n✓ Export complete! Files ready for frontend:")
    print("  - model_artifacts/intent_model.onnx")
    print("  - model_artifacts/vocabulary.json")
    print("  - model_artifacts/frontend_metadata.json")
    print("\nModel version: 2.0.0")
    print("Changes:")
    print("  - Separate day_offset, hour_of_day outputs for precise time targeting")
    print("  - Separate day_duration, hour_duration for flexible timeframes")
    print("  - Better handling of 'tomorrow at 3pm' type queries")
    print("  - More accurate timeframe calculations")

if __name__ == "__main__":
    main()