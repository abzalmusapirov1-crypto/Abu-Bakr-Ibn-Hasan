import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Lazy-initialize Gemini Client
let aiClient: GoogleGenAI | null = null;

function getGeminiClient(): GoogleGenAI {
  if (!aiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      console.warn("WARNING: GEMINI_API_KEY is not defined in environment variables.");
    }
    aiClient = new GoogleGenAI({
      apiKey: key || "MOCK_KEY",
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return aiClient;
}

// AI Diagnosis API Endpoint
app.post("/api/diagnose", async (req, res) => {
  try {
    const { description, carModel } = req.body;

    if (!description || typeof description !== "string") {
      res.status(400).json({ error: "Symptom description is required." });
      return;
    }

    const ai = getGeminiClient();

    // If API key is missing or is the placeholder, return high-quality mock data to prevent crashing
    if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === "MY_GEMINI_API_KEY") {
      console.log("No valid GEMINI_API_KEY found, returning intelligent simulated diagnosis.");
      // Simulated delay for realistic UX
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const descLower = description.toLowerCase();
      let simulatedResponse = {
        possibleCauses: ["Износ тормозных колодок", "Деформация тормозного диска", "Отсутствие смазки направляющих суппорта"],
        estimatedCostRange: { min: 2500, max: 8000 },
        recommendedSpecialties: ["Ходовая и подвеска", "Техническое обслуживание"],
        explanation: `Судя по описанию («${description}»), проблема вероятнее всего связана с деталями тормозной системы. Скрежет или писк часто указывает на критический износ фрикционных накладок тормозных колодок, при котором скрежещет металлический датчик износа («пискун»). Рекомендуется провести осмотр тормозных дисков и суппортов.`,
        recommendedActions: ["Проверить толщину колодок", "Не превышать скорость и избегать резких торможений до визита в СТО", "Записаться на диагностику тормозной системы"]
      };

      if (descLower.includes("стук") || descLower.includes("подвес") || descLower.includes("кочк") || descLower.includes("ямы")) {
        simulatedResponse = {
          possibleCauses: ["Износ сайлентблоков рычагов", "Износ амортизаторов или стоек стабилизатора", "Люфт шаровых опор"],
          estimatedCostRange: { min: 3000, max: 15000 },
          recommendedSpecialties: ["Ходовая и подвеска"],
          explanation: "Стук при проезде неровностей чаще всего исходит от изношенных элементов подвески. Это могут быть стойки стабилизатора (наиболее частый и недорогой вариант), изношенные сайлентблоки или амортизаторы, потерявшие герметичность. Люфт в шаровых опорах представляет опасность для движения.",
          recommendedActions: ["Провести диагностику ходовой части на подъемнике", "Проверить состояние пыльников шаровых опор", "Соблюдать осторожность при движении по неровностям"]
        };
      } else if (descLower.includes("масл") || descLower.includes("течет") || descLower.includes("капает") || descLower.includes("дым")) {
        simulatedResponse = {
          possibleCauses: ["Течь прокладки клапанной крышки", "Износ сальников коленчатого/распределительного вала", "Прогар маслосъемных колпачков"],
          estimatedCostRange: { min: 5000, max: 25000 },
          recommendedSpecialties: ["Двигатель"],
          explanation: "Признаки утечки масла или задымления указывают на нарушение герметичности масляной системы двигателя или износ уплотнителей. Масло может попадать на горячие части выпускного коллектора, вызывая запах гари и дым. Эксплуатация автомобиля с низким уровнем масла может привести к заклиниванию ДВС.",
          recommendedActions: ["Срочно проверить уровень масла по щупу", "Долить масло до нормы перед поездкой в сервис", "Исключить высокие обороты двигателя"]
        };
      } else if (descLower.includes("горит") || descLower.includes("чек") || descLower.includes("ошибк") || descLower.includes("заводится") || descLower.includes("электр") || descLower.includes("аккум")) {
        simulatedResponse = {
          possibleCauses: ["Неисправность датчика кислорода (лямбда-зонд)", "Пропуски зажигания (свечи или катушка)", "Низкий заряд или износ аккумулятора"],
          estimatedCostRange: { min: 1500, max: 12000 },
          recommendedSpecialties: ["Электрика", "Двигатель"],
          explanation: "Индикатор Check Engine загорается при регистрации ошибок блоком управления двигателя. Пропуски зажигания или некорректная работа датчиков могут вызывать неровную работу мотора. Требуется компьютерная диагностика сканером для считывания кодов ошибок.",
          recommendedActions: ["Сделать компьютерную диагностику OBD-II", "Проверить надежность контактов клемм аккумулятора", "Если чек мигает — прекратить движение во избежание повреждения катализатора"]
        };
      }

      res.json(simulatedResponse);
      return;
    }

    // Call real Gemini API
    const prompt = `Вы — профессиональный русский автомеханик-эксперт. Пользователь описывает неисправность или симптомы своего автомобиля:
Автомобиль: ${carModel || "Не указан"}
Симптомы: "${description}"

Проанализируйте проблему и предоставьте ответ строго в формате JSON, используя следующие ключи:
- "possibleCauses" (массив строк): 3-4 наиболее вероятных причин поломки на русском языке.
- "estimatedCostRange" (объект с числовыми ключами "min" и "max" в рублях): примерный диапазон цен ремонта (работы и базовые запчасти) в рублях РФ. Будьте реалистичны для российского рынка.
- "recommendedSpecialties" (массив строк): рекомендуемые специализации СТО из следующего списка: ["Двигатель", "Ходовая и подвеска", "Электрика", "Кузовной ремонт", "Техническое обслуживание"]. Выберите только подходящие.
- "explanation" (строка): подробное, профессиональное и дружелюбное объяснение симптомов, причин и возможных последствий на русском языке (2-4 предложения).
- "recommendedActions" (массив строк): 3 практических совета водителю о том, что делать прямо сейчас или перед визитом в сервис.

Не пишите никакого дополнительного текста до или после JSON. Выведите только валидный JSON.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            possibleCauses: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "Probable causes of the issue in Russian."
            },
            estimatedCostRange: {
              type: Type.OBJECT,
              properties: {
                min: { type: Type.INTEGER },
                max: { type: Type.INTEGER }
              },
              required: ["min", "max"]
            },
            recommendedSpecialties: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "Recommended workshop specialties from: ['Двигатель', 'Ходовая и подвеска', 'Электрика', 'Кузовной ремонт', 'Техническое обслуживание']."
            },
            explanation: {
              type: Type.STRING,
              description: "Professional mechanic explanation of the problem and advice in Russian."
            },
            recommendedActions: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "Practical steps the driver should take next in Russian."
            }
          },
          required: ["possibleCauses", "estimatedCostRange", "recommendedSpecialties", "explanation", "recommendedActions"]
        }
      }
    });

    const text = response.text;
    if (!text) {
      throw new Error("No response text from Gemini API.");
    }

    const parsedData = JSON.parse(text.trim());
    res.json(parsedData);
  } catch (error: any) {
    console.error("Error in AI diagnosis endpoint:", error);
    res.status(500).json({ 
      error: "Ошибка ИИ-диагностики", 
      message: error.message || "Не удалось получить рекомендации от ИИ. Пожалуйста, попробуйте позже." 
    });
  }
});

// Setup Vite Dev Server / Static Asset Serving
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server is running at http://localhost:${PORT}`);
  });
}

startServer();
