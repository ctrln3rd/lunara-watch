Here’s a clean, developer-friendly **README\_INTENT\_FORMAT.md** you can drop directly into your repo — documenting the unified, strict intent schema for your weather model 👇

🌤️ Weather Model — Intent Schema
=================================

This document defines the **expected format** for all weather intents returned from the ONNX model and consumed by the frontend interpreter (TypeScript).

It ensures **consistent structure**, **safe parsing**, and **easy extension** when new intents are added.

🧠 Overview
-----------

Each natural-language query (e.g. _“will it rain this weekend?”_) is parsed into one or more structured **intents**, each describing:

*   **What** the user asked for (e.g. _precipitation, temperature, wind_)
    
*   **When** they asked about it (timeframe)
    
*   **How** to filter the weather data (hourly, daily, or all)
    
*   **How confident** the model is in its interpretation
    

🧩 Intent Array Format
----------------------

The model returns **an array** of intent objects, since a user query can contain multiple requests.

Plain textANTLR4BashCC#CSSCoffeeScriptCMakeDartDjangoDockerEJSErlangGitGoGraphQLGroovyHTMLJavaJavaScriptJSONJSXKotlinLaTeXLessLuaMakefileMarkdownMATLABMarkupObjective-CPerlPHPPowerShell.propertiesProtocol BuffersPythonRRubySass (Sass)Sass (Scss)SchemeSQLShellSwiftSVGTSXTypeScriptWebAssemblyYAMLXML`   {    "query": "will it rain and be windy this weekend?",    "intents": [      {        "intent": "precipitation",        "sub_intent": "rain",        "timeframe": {          "type": "day_range",          "value": "this weekend",          "resolved_start": "2025-11-08T00:00:00+03:00",          "resolved_end": "2025-11-09T23:59:59+03:00"        },        "data_source": "daily",        "confidence": 0.92      },      {        "intent": "wind",        "sub_intent": "speed",        "timeframe": {          "type": "day_range",          "value": "this weekend",          "resolved_start": "2025-11-08T00:00:00+03:00",          "resolved_end": "2025-11-09T23:59:59+03:00"        },        "data_source": "daily",        "confidence": 0.88      }    ]  }   `

🧾 Intent Object Definition
---------------------------

FieldTypeRequiredDescription**intent**string✅Primary intent type — what the user wants to know.**sub\_intent**string❌Secondary focus or qualifier (e.g. rain, speed, max, probability).**timeframe**object✅The time reference extracted from the query (see below).**data\_source**"hourly" | "daily" | "all"✅Which data granularity to use for interpretation.**confidence**number✅Float in \[0, 1\], indicating parser confidence.

🕒 Timeframe Object Definition
------------------------------

Each intent must include a **timeframe** with standardized types for reliable filtering.

FieldTypeRequiredDescription**type**"absolute\_day" | "relative\_day" | "absolute\_time" | "relative\_time" | "day\_range"✅Time expression category.**value**string✅Original natural phrase (e.g. "this weekend", "tomorrow", "next Monday").**resolved\_start**string (ISO 8601)✅Start time resolved in full ISO 8601 format with offset (e.g. "2025-11-08T00:00:00+03:00").**resolved\_end**string (ISO 8601)✅End time resolved in the same format.

🕓 Timeframe Type Reference
---------------------------

TypeExample QueryExample valueDescriptionabsolute\_day“on Nov 6”"2025-11-06"A fixed calendar day.relative\_day“tomorrow”"tomorrow"Day relative to now().absolute\_time“at 3 PM”"15:00"Specific time of day.relative\_time“in 2 hours”"in 2 hours"Duration relative to now().day\_range“this weekend”, “next week”"this weekend"Continuous multi-day range.

🧮 Confidence Scoring (Guideline)
---------------------------------

The backend model assigns a heuristic confidence score:

ConditionWeightBase score0.5Has sub\_intent+0.2Response generated successfully+0.2Intent ≠ "unknown"+0.1**Max total1.0**

🧰 Data Source Guidelines
-------------------------

Data SourceUsed ForExample"hourly"Short-term, time-specific queries“Will it rain at 4 PM?”"daily"Whole-day or multi-day summaries“Will it rain this weekend?”"all"Broad questions combining both“How’s the weather this week?”

🧪 Example Minimal Intent Output
--------------------------------

Plain textANTLR4BashCC#CSSCoffeeScriptCMakeDartDjangoDockerEJSErlangGitGoGraphQLGroovyHTMLJavaJavaScriptJSONJSXKotlinLaTeXLessLuaMakefileMarkdownMATLABMarkupObjective-CPerlPHPPowerShell.propertiesProtocol BuffersPythonRRubySass (Sass)Sass (Scss)SchemeSQLShellSwiftSVGTSXTypeScriptWebAssemblyYAMLXML`   {    "query": "will it rain tomorrow?",    "intents": [      {        "intent": "precipitation",        "sub_intent": "rain",        "timeframe": {          "type": "relative_day",          "value": "tomorrow",          "resolved_start": "2025-11-07T00:00:00+03:00",          "resolved_end": "2025-11-07T23:59:59+03:00"        },        "data_source": "daily",        "confidence": 0.9      }    ]  }   `

🧭 Notes
--------

*   All timestamps **must include timezone offsets** (e.g. +03:00) for compatibility between **Pendulum (Python)** and **Luxon (TypeScript)**.
    
*   The backend ONNX model only handles **intent parsing**; actual **interpretation** (turning intents into human answers) happens in the frontend TypeScript interpreters.
    
*   Extendable with new intent types without breaking existing clients.
    

Would you like me to include a **JSON Schema** version of this (for validation in backend/frontend), so your frontend can type-check ONNX outputs automatically?