export interface Review {
  id: string;
  author: string;
  carModel: string;
  rating: number;
  text: string;
  date: string;
}

export interface Workshop {
  id: string;
  name: string;
  description: string;
  address: string;
  phone: string;
  specialties: Array<"Двигатель" | "Ходовая и подвеска" | "Электрика" | "Кузовной ремонт" | "Техническое обслуживание">;
  priceLevel: "₽" | "₽₽" | "₽₽₽"; // ₽ = Budget, ₽₽ = Medium, ₽₽₽ = Premium
  priceEstimate: {
    diagnostics: number;
    hourlyRate: number;
  };
  rating: number;
  reviews: Review[];
  location: {
    x: number; // SVG coordinate x (0-600)
    y: number; // SVG coordinate y (0-400)
  };
  image: string;
}

export interface Booking {
  id: string;
  workshopId: string;
  workshopName: string;
  carModel: string;
  carPlate: string;
  serviceType: string;
  date: string;
  time: string;
  status: "Ожидает подтверждения" | "Подтверждена" | "Выполнена" | "Отменена";
  comment?: string;
  createdAt: string;
}

export interface DiagnosisResult {
  possibleCauses: string[];
  estimatedCostRange: {
    min: number;
    max: number;
  };
  recommendedSpecialties: string[];
  explanation: string;
  recommendedActions: string[];
}
