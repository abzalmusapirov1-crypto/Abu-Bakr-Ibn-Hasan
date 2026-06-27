import React, { useState, useMemo, useEffect } from "react";
import {
  Wrench,
  MapPin,
  Star,
  Coins,
  ShieldAlert,
  Bot,
  Calendar,
  Search,
  Filter,
  Car,
  Phone,
  Clock,
  User,
  Plus,
  X,
  ChevronRight,
  Check,
  AlertCircle,
  Navigation,
  Sparkles,
  ListFilter,
  Map,
  Send,
  ThumbsUp,
  CheckCircle2,
  Trash2
} from "lucide-react";
import { Workshop, Review, Booking, DiagnosisResult } from "./types";
import { INITIAL_WORKSHOPS } from "./data";

export default function App() {
  // --- States ---
  const [workshops, setWorkshops] = useState<Workshop[]>(INITIAL_WORKSHOPS);
  const [activeTab, setActiveTab] = useState<"workshops" | "diagnose" | "bookings">("workshops");
  
  // User simulated location (x, y coordinates on SVG map)
  const [userLocation, setUserLocation] = useState({ x: 300, y: 220 });
  const [isRelocating, setIsRelocating] = useState(false);

  // Filters state
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSpecialties, setSelectedSpecialties] = useState<string[]>([]);
  const [selectedPriceLevels, setSelectedPriceLevels] = useState<string[]>([]);
  const [minRating, setMinRating] = useState<number>(0);
  const [sortBy, setSortBy] = useState<"recommended" | "distance" | "rating" | "price_asc">("recommended");

  // Selected Workshop for Detail Modal / Sidebar
  const [selectedWorkshopId, setSelectedWorkshopId] = useState<string | null>(INITIAL_WORKSHOPS[0].id);
  const [hoveredWorkshopId, setHoveredWorkshopId] = useState<string | null>(null);

  // Write Review form state
  const [newReviewAuthor, setNewReviewAuthor] = useState("");
  const [newReviewCar, setNewReviewCar] = useState("");
  const [newReviewRating, setNewReviewRating] = useState(5);
  const [newReviewText, setNewReviewText] = useState("");
  const [reviewError, setReviewError] = useState("");

  // Booking Form modal state
  const [bookingWorkshop, setBookingWorkshop] = useState<Workshop | null>(null);
  const [bookingCarModel, setBookingCarModel] = useState("");
  const [bookingCarPlate, setBookingCarPlate] = useState("");
  const [bookingService, setBookingService] = useState("");
  const [bookingDate, setBookingDate] = useState("");
  const [bookingTime, setBookingTime] = useState("10:00");
  const [bookingComment, setBookingComment] = useState("");
  const [bookingSuccess, setBookingSuccess] = useState(false);

  // Loaded bookings list
  const [bookings, setBookings] = useState<Booking[]>(() => {
    // Initial dummy booking for visual completeness
    return [
      {
        id: "b1",
        workshopId: "1",
        workshopName: "Форсаж-Авто",
        carModel: "Kia Rio",
        carPlate: "А777АА 178",
        serviceType: "Ходовая и подвеска",
        date: "2026-06-30",
        time: "14:00",
        status: "Подтверждена",
        comment: "Замена передних колодок",
        createdAt: "2026-06-27"
      }
    ];
  });

  // AI Diagnosis Form state
  const [aiCarModel, setAiCarModel] = useState("");
  const [aiSymptoms, setAiSymptoms] = useState("");
  const [isDiagnosing, setIsDiagnosing] = useState(false);
  const [diagnosisResult, setDiagnosisResult] = useState<DiagnosisResult | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);
  const [appliedAiFilters, setAppliedAiFilters] = useState(false);

  // Quick notification banner state
  const [bannerMessage, setBannerMessage] = useState<string | null>(
    "🗺️ Кликните в любом месте карты справа, чтобы переместить свой автомобиль и пересчитать расстояния до СТО!"
  );

  // --- Dynamic Distance Computation helper ---
  const calculateDistance = (workshopLoc: { x: number; y: number }) => {
    const dx = workshopLoc.x - userLocation.x;
    const dy = workshopLoc.y - userLocation.y;
    const pixels = Math.sqrt(dx * dx + dy * dy);
    // Scale: 100px equals 1.5 km
    return parseFloat((pixels * 0.015).toFixed(1));
  };

  const selectedWorkshop = useMemo(() => {
    return workshops.find((w) => w.id === selectedWorkshopId) || null;
  }, [workshops, selectedWorkshopId]);

  // --- Filter and Sort Logic ---
  const filteredWorkshops = useMemo(() => {
    return workshops
      .map((workshop) => ({
        ...workshop,
        computedDistance: calculateDistance(workshop.location),
      }))
      .filter((w) => {
        // Search query
        const matchesSearch =
          w.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          w.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
          w.address.toLowerCase().includes(searchQuery.toLowerCase());

        // Specialties filter
        const matchesSpecialty =
          selectedSpecialties.length === 0 ||
          selectedSpecialties.some((spec) => w.specialties.includes(spec as any));

        // Price levels filter
        const matchesPrice =
          selectedPriceLevels.length === 0 ||
          selectedPriceLevels.includes(w.priceLevel);

        // Rating filter
        const matchesRating = w.rating >= minRating;

        return matchesSearch && matchesSpecialty && matchesPrice && matchesRating;
      })
      .sort((a, b) => {
        if (sortBy === "distance") {
          return a.computedDistance - b.computedDistance;
        }
        if (sortBy === "rating") {
          return b.rating - a.rating;
        }
        if (sortBy === "price_asc") {
          const aPrice = a.priceLevel.length;
          const bPrice = b.priceLevel.length;
          return aPrice - bPrice;
        }
        // Recommended formula: balanced combination of high rating and low distance
        const aScore = a.rating * 10 - a.computedDistance * 0.5 - a.priceLevel.length * 2;
        const bScore = b.rating * 10 - b.computedDistance * 0.5 - b.priceLevel.length * 2;
        return bScore - aScore;
      });
  }, [workshops, searchQuery, selectedSpecialties, selectedPriceLevels, minRating, sortBy, userLocation]);

  // --- Actions ---
  const handleMapClick = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.round(((e.clientX - rect.left) / rect.width) * 600);
    const y = Math.round(((e.clientY - rect.top) / rect.height) * 400);
    
    setIsRelocating(true);
    setUserLocation({ x, y });
    setTimeout(() => setIsRelocating(false), 500);

    setBannerMessage("📍 Местоположение вашего авто изменено! Все расстояния до автосервисов автоматически пересчитаны.");
    setTimeout(() => setBannerMessage(null), 5000);
  };

  const handleAddReview = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newReviewAuthor.trim() || !newReviewCar.trim() || !newReviewText.trim()) {
      setReviewError("Пожалуйста, заполните все поля отзыва.");
      return;
    }

    if (!selectedWorkshopId) return;

    const newReview: Review = {
      id: "r-" + Date.now(),
      author: newReviewAuthor.trim(),
      carModel: newReviewCar.trim(),
      rating: newReviewRating,
      text: newReviewText.trim(),
      date: new Date().toISOString().split("T")[0]
    };

    setWorkshops((prev) =>
      prev.map((w) => {
        if (w.id === selectedWorkshopId) {
          const updatedReviews = [newReview, ...w.reviews];
          // Recalculate average rating
          const totalRating = updatedReviews.reduce((sum, r) => sum + r.rating, 0);
          const averageRating = parseFloat((totalRating / updatedReviews.length).toFixed(1));
          return {
            ...w,
            reviews: updatedReviews,
            rating: averageRating
          };
        }
        return w;
      })
    );

    // Clear form
    setNewReviewAuthor("");
    setNewReviewCar("");
    setNewReviewRating(5);
    setNewReviewText("");
    setReviewError("");

    setBannerMessage("⭐ Спасибо за ваш отзыв! Рейтинг мастерской успешно обновлен.");
    setTimeout(() => setBannerMessage(null), 5000);
  };

  const handleBookingSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!bookingWorkshop || !bookingCarModel || !bookingCarPlate || !bookingService || !bookingDate) {
      return;
    }

    const newBooking: Booking = {
      id: "b-" + Date.now(),
      workshopId: bookingWorkshop.id,
      workshopName: bookingWorkshop.name,
      carModel: bookingCarModel,
      carPlate: bookingCarPlate,
      serviceType: bookingService,
      date: bookingDate,
      time: bookingTime,
      status: "Ожидает подтверждения",
      comment: bookingComment,
      createdAt: new Date().toISOString().split("T")[0]
    };

    setBookings([newBooking, ...bookings]);
    setBookingSuccess(true);

    setTimeout(() => {
      setBookingSuccess(false);
      setBookingWorkshop(null); // Close modal
      // Clear fields
      setBookingCarModel("");
      setBookingCarPlate("");
      setBookingService("");
      setBookingDate("");
      setBookingComment("");
    }, 2000);
  };

  const handleCancelBooking = (bookingId: string) => {
    setBookings((prev) =>
      prev.map((b) => (b.id === bookingId ? { ...b, status: "Отменена" as const } : b))
    );
  };

  const handleDeleteBooking = (bookingId: string) => {
    setBookings((prev) => prev.filter((b) => b.id !== bookingId));
  };

  const runAiDiagnosis = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiSymptoms.trim()) {
      setAiError("Опишите симптомы неисправности.");
      return;
    }

    setIsDiagnosing(true);
    setAiError(null);
    setDiagnosisResult(null);
    setAppliedAiFilters(false);

    try {
      const response = await fetch("/api/diagnose", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          description: aiSymptoms,
          carModel: aiCarModel,
        }),
      });

      if (!response.ok) {
        throw new Error("Не удалось получить ответ от сервера диагностики.");
      }

      const data = await response.json();
      setDiagnosisResult(data);
    } catch (err: any) {
      console.error(err);
      setAiError(err.message || "Ошибка подключения к серверу автодиагностики.");
    } finally {
      setIsDiagnosing(false);
    }
  };

  const applyAiRecommendations = () => {
    if (!diagnosisResult) return;
    
    // Set specialty filters
    setSelectedSpecialties(diagnosisResult.recommendedSpecialties);
    
    // Auto-sort by closest, since they need actual help
    setSortBy("distance");
    
    setAppliedAiFilters(true);
    setActiveTab("workshops");

    setBannerMessage(`🤖 Применены ИИ-фильтры: Специализация: ${diagnosisResult.recommendedSpecialties.join(", ")}. Сортировка: Ближайшие.`);
    setTimeout(() => setBannerMessage(null), 6000);
  };

  const toggleSpecialty = (spec: string) => {
    setSelectedSpecialties((prev) =>
      prev.includes(spec) ? prev.filter((s) => s !== spec) : [...prev, spec]
    );
  };

  const togglePriceLevel = (level: string) => {
    setSelectedPriceLevels((prev) =>
      prev.includes(level) ? prev.filter((l) => l !== level) : [...prev, level]
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans flex flex-col">
      
      {/* Header */}
      <header className="bg-slate-900 text-white shadow-md border-b border-slate-800 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-sky-500 rounded-lg text-white shadow-md">
              <Wrench className="w-6 h-6 animate-spin-slow" />
            </div>
            <div>
              <h1 className="text-xl font-display font-bold tracking-tight text-white flex items-center gap-2">
                AutoRemont <span className="text-sky-400 font-medium text-sm bg-sky-950/80 px-2 py-0.5 rounded border border-sky-800">MATCH</span>
              </h1>
              <p className="text-xs text-slate-400">Умный поиск автосервисов по отзывам, цене и расстоянию</p>
            </div>
          </div>

          {/* Quick status bar */}
          <div className="flex items-center gap-4 text-xs text-slate-300">
            <div className="bg-slate-800 px-3 py-1.5 rounded-full flex items-center gap-2 border border-slate-700">
              <Navigation className="w-3.5 h-3.5 text-sky-400" />
              <span>Координаты авто: </span>
              <strong className="text-white font-mono">X:{userLocation.x} Y:{userLocation.y}</strong>
            </div>
            <div className="bg-slate-800 px-3 py-1.5 rounded-full flex items-center gap-2 border border-slate-700">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>ИИ-механик: <strong className="text-emerald-400 font-medium">Онлайн</strong></span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 flex flex-col gap-6">
        
        {/* Banner notification */}
        {bannerMessage && (
          <div className="bg-sky-50 border border-sky-200 text-sky-900 rounded-xl p-3.5 flex items-start gap-3 shadow-sm text-sm animate-fade-in">
            <Sparkles className="w-5 h-5 text-sky-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              {bannerMessage}
            </div>
            <button 
              onClick={() => setBannerMessage(null)} 
              className="text-sky-600 hover:text-sky-800"
              aria-label="Закрыть уведомление"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Dashboard Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Left Column - Main Interactive Panels (8 cols) */}
          <section className="lg:col-span-7 xl:col-span-8 flex flex-col gap-6">
            
            {/* View Selectors */}
            <div className="bg-white p-1 rounded-xl shadow-sm border border-slate-200 flex">
              <button
                onClick={() => setActiveTab("workshops")}
                className={`flex-1 py-3 px-4 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                  activeTab === "workshops"
                    ? "bg-slate-900 text-white shadow-sm"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                }`}
              >
                <Wrench className="w-4 h-4" />
                <span>Автосервисы ({filteredWorkshops.length})</span>
              </button>

              <button
                onClick={() => setActiveTab("diagnose")}
                className={`flex-1 py-3 px-4 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 relative ${
                  activeTab === "diagnose"
                    ? "bg-slate-900 text-white shadow-sm"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                }`}
              >
                <Bot className="w-4 h-4" />
                <span>ИИ Диагностика</span>
                {diagnosisResult && (
                  <span className="absolute -top-1 -right-1 bg-sky-500 w-2.5 h-2.5 rounded-full ring-2 ring-white"></span>
                )}
              </button>

              <button
                onClick={() => setActiveTab("bookings")}
                className={`flex-1 py-3 px-4 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 relative ${
                  activeTab === "bookings"
                    ? "bg-slate-900 text-white shadow-sm"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                }`}
              >
                <Calendar className="w-4 h-4" />
                <span>Мои записи</span>
                {bookings.filter(b => b.status === "Ожидает подтверждения").length > 0 && (
                  <span className="bg-rose-500 text-white font-mono font-bold text-[10px] w-4.5 h-4.5 flex items-center justify-center rounded-full">
                    {bookings.filter(b => b.status === "Ожидает подтверждения").length}
                  </span>
                )}
              </button>
            </div>

            {/* TAB 1: WORKSHOPS LIST & FILTERS */}
            {activeTab === "workshops" && (
              <div className="flex flex-col gap-6">
                
                {/* Advanced Filters Panel */}
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex flex-col gap-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <h2 className="font-display font-semibold text-slate-900 flex items-center gap-2">
                      <ListFilter className="w-4 h-4 text-slate-500" />
                      Параметры подбора СТО
                    </h2>
                    {(searchQuery || selectedSpecialties.length > 0 || selectedPriceLevels.length > 0 || minRating > 0) && (
                      <button
                        onClick={() => {
                          setSearchQuery("");
                          setSelectedSpecialties([]);
                          setSelectedPriceLevels([]);
                          setMinRating(0);
                        }}
                        className="text-xs text-rose-500 hover:text-rose-700 font-medium"
                      >
                        Сбросить фильтры
                      </button>
                    )}
                  </div>

                  {/* Row 1: Search and Rating */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="relative">
                      <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                      <input
                        type="text"
                        placeholder="Поиск по названию, адресу, услугам..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 bg-slate-50/50"
                      />
                    </div>

                    <div className="flex items-center gap-2 bg-slate-50/50 border border-slate-200 px-3.5 py-2.5 rounded-xl">
                      <span className="text-xs font-medium text-slate-500 whitespace-nowrap">Миним. рейтинг:</span>
                      <div className="flex gap-1 flex-1 justify-around">
                        {[0, 4, 4.5].map((val) => (
                          <button
                            key={val}
                            onClick={() => setMinRating(val)}
                            className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all ${
                              minRating === val
                                ? "bg-amber-500 text-white shadow-sm"
                                : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
                            }`}
                          >
                            {val === 0 ? "Любой" : `${val}★ +`}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Row 2: Specialty Chips */}
                  <div>
                    <span className="text-xs font-semibold text-slate-400 block mb-2 uppercase tracking-wider">Специализация СТО:</span>
                    <div className="flex flex-wrap gap-1.5">
                      {["Двигатель", "Ходовая и подвеска", "Электрика", "Кузовной ремонт", "Техническое обслуживание"].map((spec) => {
                        const isSelected = selectedSpecialties.includes(spec);
                        return (
                          <button
                            key={spec}
                            onClick={() => toggleSpecialty(spec)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all flex items-center gap-1 border ${
                              isSelected
                                ? "bg-sky-500 border-sky-600 text-white shadow-sm"
                                : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                            }`}
                          >
                            {spec}
                            {isSelected && <Check className="w-3.5 h-3.5 ml-0.5" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Row 3: Price Level & Sorting */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-slate-50">
                    <div>
                      <span className="text-xs font-semibold text-slate-400 block mb-2 uppercase tracking-wider">Ценовая категория:</span>
                      <div className="flex gap-2">
                        {[
                          { val: "₽", label: "Бюджетный (₽)" },
                          { val: "₽₽", label: "Средний (₽₽)" },
                          { val: "₽₽₽", label: "Премиум (₽₽₽)" }
                        ].map((p) => {
                          const isSelected = selectedPriceLevels.includes(p.val);
                          return (
                            <button
                              key={p.val}
                              onClick={() => togglePriceLevel(p.val)}
                              className={`flex-1 py-1.5 rounded-xl text-xs font-semibold transition-all border ${
                                isSelected
                                  ? "bg-slate-900 text-white border-slate-900 shadow-sm"
                                  : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                              }`}
                            >
                              {p.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div>
                      <span className="text-xs font-semibold text-slate-400 block mb-2 uppercase tracking-wider">Сортировать СТО по:</span>
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          { val: "recommended", label: "Рекомендованные" },
                          { val: "distance", label: "Ближайшие к авто" },
                          { val: "rating", label: "Лучший рейтинг" },
                          { val: "price_asc", label: "Меньшая цена" }
                        ].map((s) => (
                          <button
                            key={s.val}
                            onClick={() => setSortBy(s.val as any)}
                            className={`py-1.5 px-2 rounded-xl text-xs font-medium text-center transition-all border ${
                              sortBy === s.val
                                ? "bg-sky-50 text-sky-700 border-sky-300 font-semibold"
                                : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                            }`}
                          >
                            {s.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Workshops List */}
                <div className="flex flex-col gap-4">
                  {filteredWorkshops.length === 0 ? (
                    <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 shadow-sm flex flex-col items-center justify-center gap-4">
                      <div className="p-4 bg-slate-100 rounded-full text-slate-400">
                        <Search className="w-8 h-8" />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-slate-800">Мастерские не найдены</h3>
                        <p className="text-sm text-slate-500 mt-1 max-w-md">
                          Попробуйте смягчить критерии фильтрации (например, выбрать любой рейтинг или сбросить специализации).
                        </p>
                      </div>
                      <button
                        onClick={() => {
                          setSearchQuery("");
                          setSelectedSpecialties([]);
                          setSelectedPriceLevels([]);
                          setMinRating(0);
                          setSortBy("recommended");
                        }}
                        className="mt-2 bg-slate-900 text-white text-xs px-4 py-2 rounded-lg font-medium hover:bg-slate-800"
                      >
                        Сбросить все настройки
                      </button>
                    </div>
                  ) : (
                    filteredWorkshops.map((w) => {
                      const isSelected = selectedWorkshopId === w.id;
                      return (
                        <div
                          key={w.id}
                          id={`workshop-card-${w.id}`}
                          onMouseEnter={() => setHoveredWorkshopId(w.id)}
                          onMouseLeave={() => setHoveredWorkshopId(null)}
                          className={`bg-white rounded-2xl shadow-sm border transition-all duration-300 flex flex-col md:flex-row overflow-hidden hover:shadow-md ${
                            isSelected
                              ? "border-sky-500 ring-2 ring-sky-50"
                              : hoveredWorkshopId === w.id
                              ? "border-slate-300"
                              : "border-slate-200"
                          }`}
                        >
                          {/* Workshop Image / Badge */}
                          <div className="relative w-full md:w-48 h-32 md:h-auto overflow-hidden shrink-0">
                            <img
                              src={w.image}
                              alt={w.name}
                              className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
                              referrerPolicy="no-referrer"
                            />
                            <div className="absolute top-2 left-2 bg-slate-900/95 text-white text-[10px] uppercase tracking-wider px-2 py-1 rounded-md font-bold">
                              {w.priceLevel === "₽" ? "Эконом" : w.priceLevel === "₽₽" ? "Средний" : "Премиум"}
                            </div>
                            <div className="absolute bottom-2 left-2 bg-sky-500 text-white text-xs px-2 py-0.5 rounded-full font-semibold flex items-center gap-1 shadow">
                              <Navigation className="w-3 h-3 rotate-45" />
                              <span>{w.computedDistance} км</span>
                            </div>
                          </div>

                          {/* Workshop Content Info */}
                          <div className="p-5 flex-1 flex flex-col justify-between gap-4">
                            <div>
                              <div className="flex justify-between items-start gap-2">
                                <div>
                                  <h3 className="font-display font-bold text-lg text-slate-900 hover:text-sky-600 transition-colors cursor-pointer" onClick={() => setSelectedWorkshopId(w.id)}>
                                    {w.name}
                                  </h3>
                                  <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1">
                                    <MapPin className="w-3.5 h-3.5 text-rose-500" />
                                    <span>{w.address}</span>
                                  </p>
                                </div>

                                <div className="flex items-center gap-1 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200 self-start">
                                  <Star className="w-4 h-4 fill-amber-400 text-amber-500" />
                                  <span className="text-sm font-bold text-amber-800">{w.rating}</span>
                                  <span className="text-[10px] text-amber-600">({w.reviews.length})</span>
                                </div>
                              </div>

                              <p className="text-slate-600 text-xs mt-2.5 line-clamp-2">
                                {w.description}
                              </p>

                              {/* Specialties badges */}
                              <div className="flex flex-wrap gap-1 mt-3">
                                {w.specialties.map((spec) => (
                                  <span
                                    key={spec}
                                    className="px-2 py-0.5 bg-slate-100 text-slate-600 text-[10px] font-medium rounded-md border border-slate-150"
                                  >
                                    {spec}
                                  </span>
                                ))}
                              </div>
                            </div>

                            {/* Service action block */}
                            <div className="border-t border-slate-100 pt-3 flex items-center justify-between flex-wrap gap-2 text-xs">
                              <div className="flex items-center gap-4 text-slate-500">
                                <div>
                                  Диагностика: <strong className="text-slate-800 font-mono">{w.priceEstimate.diagnostics} ₽</strong>
                                </div>
                                <div className="hidden sm:inline">
                                  Нормо-час: <strong className="text-slate-800 font-mono">{w.priceEstimate.hourlyRate} ₽</strong>
                                </div>
                              </div>

                              <div className="flex gap-2">
                                <button
                                  onClick={() => setSelectedWorkshopId(w.id)}
                                  className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                                    isSelected
                                      ? "bg-sky-50 text-sky-700 border border-sky-200"
                                      : "bg-slate-100 hover:bg-slate-200 text-slate-700"
                                  }`}
                                >
                                  Отзывы ({w.reviews.length})
                                </button>
                                <button
                                  onClick={() => {
                                    setBookingWorkshop(w);
                                    setBookingService(w.specialties[0] || "Диагностика");
                                  }}
                                  className="bg-slate-900 hover:bg-slate-800 text-white font-medium px-3 py-1.5 rounded-lg flex items-center gap-1"
                                >
                                  <Calendar className="w-3.5 h-3.5" />
                                  <span>Записаться</span>
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}

            {/* TAB 2: AI DIAGNOSTICS */}
            {activeTab === "diagnose" && (
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex flex-col gap-6">
                
                {/* AI Assistant Intro */}
                <div className="bg-slate-900 text-white rounded-2xl p-5 relative overflow-hidden flex flex-col md:flex-row items-center gap-6 shadow-md">
                  <div className="absolute right-0 bottom-0 top-0 w-1/3 opacity-10 pointer-events-none">
                    <Wrench className="w-full h-full text-white rotate-12" />
                  </div>
                  
                  <div className="p-3 bg-sky-500 rounded-2xl text-white shadow">
                    <Bot className="w-10 h-10 animate-bounce" />
                  </div>

                  <div className="flex-1 text-center md:text-left">
                    <h3 className="font-display font-bold text-lg text-white flex items-center justify-center md:justify-start gap-2">
                      Интеллектуальный ИИ-Автомеханик
                      <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-sky-600 tracking-wider">PREVIEW</span>
                    </h3>
                    <p className="text-xs text-slate-300 mt-1 max-w-lg">
                      Опишите симптомы своими словами (например: "греется двигатель в пробках" или "стучит слева при повороте руля"). ИИ диагностирует неисправность, назовет бюджет ремонта и подберет лучшие мастерские!
                    </p>
                  </div>
                </div>

                {/* Diagnostics Input Form */}
                <form onSubmit={runAiDiagnosis} className="bg-slate-50 rounded-xl p-4 border border-slate-200 flex flex-col gap-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="md:col-span-1">
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Марка и модель авто:</label>
                      <input
                        type="text"
                        placeholder="Напр. Ford Focus 2015"
                        value={aiCarModel}
                        onChange={(e) => setAiCarModel(e.target.value)}
                        className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-200 bg-white focus:ring-2 focus:ring-sky-500"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Симптомы поломки (свист, стук, вибрация...):</label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          required
                          placeholder="Свистит спереди при торможении..."
                          value={aiSymptoms}
                          onChange={(e) => setAiSymptoms(e.target.value)}
                          className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-200 bg-white focus:ring-2 focus:ring-sky-500"
                        />
                        <button
                          type="submit"
                          disabled={isDiagnosing}
                          className="bg-sky-500 hover:bg-sky-600 disabled:bg-slate-300 text-white font-medium px-4 py-2 rounded-lg text-sm transition-all whitespace-nowrap flex items-center gap-1.5"
                        >
                          {isDiagnosing ? (
                            <>
                              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                              <span>Анализ...</span>
                            </>
                          ) : (
                            <>
                              <Sparkles className="w-4 h-4" />
                              <span>Диагностика</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Predefined prompt helpers */}
                  <div className="flex items-center gap-2 flex-wrap text-xs text-slate-500">
                    <span>Готовые примеры:</span>
                    {[
                      { l: "Свистит ремень при запуске", val: "При холодном запуске двигателя слышен сильный свист из-под капота, пропадает через пару минут." },
                      { l: "Глухой стук на ямах", val: "При проезде лежачих полицейских и ям на небольшой скорости слышен металлический стук и скрежет спереди справа." },
                      { l: "Горит лампа аккумулятора", val: "На приборной панели загорелся красный значок аккумулятора, тускнеют фары во время езды." },
                      { l: "Течет черное масло", val: "На парковочном месте под двигателем стали оставаться темные капли свежего масла." }
                    ].map((h, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          setAiSymptoms(h.val);
                          setAiCarModel("Иномарка");
                        }}
                        className="bg-white border border-slate-200 px-2 py-1 rounded-md text-slate-600 hover:bg-sky-50 hover:text-sky-700 transition-colors"
                      >
                        {h.l}
                      </button>
                    ))}
                  </div>
                </form>

                {/* Diagnostics Progress Loader */}
                {isDiagnosing && (
                  <div className="p-8 text-center flex flex-col items-center justify-center gap-3">
                    <div className="relative">
                      <div className="w-16 h-16 border-4 border-sky-100 border-t-sky-500 rounded-full animate-spin"></div>
                      <Wrench className="w-6 h-6 text-sky-500 absolute top-5 left-5 animate-pulse" />
                    </div>
                    <div className="animate-pulse">
                      <h4 className="font-semibold text-slate-800 text-sm">ИИ анализирует признаки...</h4>
                      <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                        Запрос обрабатывается моделью <strong>gemini-3.5-flash</strong>. Проверяем каталоги запчастей и технологические карты работ...
                      </p>
                    </div>
                  </div>
                )}

                {/* Diagnostics Results Container */}
                {diagnosisResult && (
                  <div className="bg-white rounded-xl border border-sky-100 shadow-md p-5 flex flex-col gap-5 animate-fade-in">
                    
                    {/* Header of diagnostics */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                      <div>
                        <div className="text-xs font-bold text-sky-600 uppercase tracking-wider">Заключение ИИ-Механика</div>
                        <h4 className="text-lg font-bold text-slate-900 mt-0.5">Лист предварительной автодиагностики</h4>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={applyAiRecommendations}
                          disabled={appliedAiFilters}
                          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm ${
                            appliedAiFilters
                              ? "bg-emerald-500 text-white"
                              : "bg-sky-500 hover:bg-sky-600 text-white"
                          }`}
                        >
                          {appliedAiFilters ? (
                            <>
                              <CheckCircle2 className="w-4 h-4" />
                              <span>Рекомендации применены</span>
                            </>
                          ) : (
                            <>
                              <Filter className="w-4 h-4" />
                              <span>Показать СТО для этого ремонта</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
                      
                      {/* Left Block - Causes & Budget */}
                      <div className="md:col-span-7 flex flex-col gap-4">
                        
                        {/* Explanation */}
                        <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                          <h5 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Анализ симптомов:</h5>
                          <p className="text-slate-700 text-sm leading-relaxed font-sans">{diagnosisResult.explanation}</p>
                        </div>

                        {/* Causes */}
                        <div>
                          <h5 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Вероятные причины поломки:</h5>
                          <ul className="space-y-2">
                            {diagnosisResult.possibleCauses.map((cause, idx) => (
                              <li key={idx} className="flex items-start gap-2.5 text-slate-700 text-sm">
                                <span className="bg-sky-100 text-sky-700 text-xs font-mono w-5 h-5 flex items-center justify-center rounded-full mt-0.5">
                                  {idx + 1}
                                </span>
                                <span>{cause}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>

                      {/* Right Block - Estimated Budget, Recommended Specialties */}
                      <div className="md:col-span-5 flex flex-col gap-4">
                        
                        {/* Budget */}
                        <div className="bg-sky-50/50 border border-sky-100 rounded-2xl p-4 flex flex-col items-center justify-center text-center">
                          <Coins className="w-6 h-6 text-sky-500 mb-1" />
                          <span className="text-xs font-semibold text-slate-500">Примерный бюджет (работа + детали)</span>
                          <span className="text-xl font-mono font-bold text-sky-950 mt-1">
                            {diagnosisResult.estimatedCostRange.min.toLocaleString()} — {diagnosisResult.estimatedCostRange.max.toLocaleString()} ₽
                          </span>
                          <span className="text-[10px] text-slate-400 mt-1">Разброс цен зависит от марки авто и качества запчастей</span>
                        </div>

                        {/* Required Specialties */}
                        <div className="border border-slate-100 rounded-2xl p-4">
                          <h5 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2.5">Необходимая специализация СТО:</h5>
                          <div className="flex flex-wrap gap-1.5">
                            {diagnosisResult.recommendedSpecialties.map((spec, idx) => (
                              <span
                                key={idx}
                                className="px-3 py-1 bg-sky-100 text-sky-800 text-xs font-semibold rounded-lg border border-sky-200 flex items-center gap-1"
                              >
                                <Check className="w-3.5 h-3.5" />
                                {spec}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Quick safety checklist */}
                    <div className="bg-amber-50 border border-amber-150 rounded-xl p-4 flex items-start gap-3">
                      <ShieldAlert className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                      <div>
                        <h5 className="text-xs font-bold text-amber-800 uppercase tracking-wider">Рекомендации по безопасности:</h5>
                        <ul className="list-disc list-inside text-xs text-amber-900 mt-1.5 space-y-1">
                          {diagnosisResult.recommendedActions.map((act, idx) => (
                            <li key={idx}>{act}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                )}

                {/* API Error handler */}
                {aiError && (
                  <div className="bg-rose-50 border border-rose-200 text-rose-900 p-4 rounded-xl flex items-start gap-3 text-sm">
                    <AlertCircle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-bold text-rose-950">Временный сбой ИИ-диагностики</h4>
                      <p className="mt-1 text-xs text-rose-800">{aiError}</p>
                      <button
                        onClick={runAiDiagnosis}
                        className="mt-2 bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs px-3 py-1.5 rounded"
                      >
                        Повторить попытку
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TAB 3: BOOKINGS MANAGEMENT */}
            {activeTab === "bookings" && (
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
                <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-6">
                  <div>
                    <h2 className="text-lg font-display font-bold text-slate-900">Мои записи на авторемонт</h2>
                    <p className="text-xs text-slate-500">История и статус текущих обращений в автосервисы</p>
                  </div>
                  <button
                    onClick={() => setActiveTab("workshops")}
                    className="text-xs text-sky-500 hover:text-sky-700 font-medium flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Записаться в новое СТО</span>
                  </button>
                </div>

                {bookings.length === 0 ? (
                  <div className="text-center p-12 flex flex-col items-center justify-center gap-3">
                    <Calendar className="w-10 h-10 text-slate-300" />
                    <h3 className="text-sm font-bold text-slate-800">У вас пока нет активных записей</h3>
                    <p className="text-xs text-slate-500 max-w-sm">
                      Выберите автосервис в каталоге или воспользуйтесь ИИ-диагностикой, чтобы записаться на нужные работы.
                    </p>
                    <button
                      onClick={() => setActiveTab("workshops")}
                      className="bg-slate-900 text-white text-xs px-4 py-2 rounded-lg font-medium hover:bg-slate-850 mt-2"
                    >
                      Посмотреть каталог СТО
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {bookings.map((b) => (
                      <div
                        key={b.id}
                        className={`border rounded-xl p-5 flex flex-col sm:flex-row justify-between gap-4 transition-all ${
                          b.status === "Отменена"
                            ? "bg-slate-50 border-slate-200 opacity-60"
                            : b.status === "Ожидает подтверждения"
                            ? "bg-amber-50/50 border-amber-200"
                            : "bg-white border-sky-100 shadow-sm"
                        }`}
                      >
                        <div className="flex items-start gap-3.5">
                          <div className={`p-2.5 rounded-xl text-white ${
                            b.status === "Отменена"
                              ? "bg-slate-400"
                              : b.status === "Ожидает подтверждения"
                              ? "bg-amber-400"
                              : "bg-emerald-500"
                          }`}>
                            <Car className="w-5 h-5" />
                          </div>

                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="font-bold text-slate-900">{b.workshopName}</h4>
                              <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                                b.status === "Подтверждена"
                                  ? "bg-emerald-100 text-emerald-800"
                                  : b.status === "Ожидает подтверждения"
                                  ? "bg-amber-100 text-amber-800"
                                  : "bg-slate-200 text-slate-700"
                              }`}>
                                {b.status}
                              </span>
                            </div>

                            <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                              <span className="font-semibold text-slate-700">{b.carModel}</span>
                              {b.carPlate && <span className="bg-slate-100 px-1.5 py-0.5 rounded font-mono text-[10px] text-slate-600 border border-slate-200">{b.carPlate}</span>}
                            </p>

                            <p className="text-sm font-medium text-slate-800 mt-2.5">
                              Услуга: <span className="text-sky-600">{b.serviceType}</span>
                            </p>

                            {b.comment && (
                              <p className="text-xs text-slate-500 italic mt-1 bg-slate-50 p-2 rounded border border-slate-150">
                                Комментарий: "{b.comment}"
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Date and actions block */}
                        <div className="flex sm:flex-col items-end justify-between sm:justify-center gap-3 shrink-0 border-t sm:border-t-0 pt-3 sm:pt-0 border-slate-100">
                          <div className="text-right">
                            <div className="text-xs text-slate-400">Дата и время записи</div>
                            <div className="text-sm font-bold text-slate-800 flex items-center gap-1.5 mt-0.5">
                              <Clock className="w-4 h-4 text-sky-500" />
                              <span>{b.date} в {b.time}</span>
                            </div>
                          </div>

                          <div className="flex gap-2">
                            {b.status === "Ожидает подтверждения" && (
                              <button
                                onClick={() => handleCancelBooking(b.id)}
                                className="text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-rose-500 hover:text-rose-700 font-medium"
                              >
                                Отменить
                              </button>
                            )}
                            {(b.status === "Отменена" || b.status === "Выполнена") && (
                              <button
                                onClick={() => handleDeleteBooking(b.id)}
                                className="text-xs p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 transition-colors"
                                title="Удалить из списка"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </section>

          {/* Right Column - Map and Detail Panel (4 cols) */}
          <section className="lg:col-span-5 xl:col-span-4 flex flex-col gap-6">
            
            {/* INTERACTIVE CITY MAP CARD */}
            <div className="bg-slate-900 rounded-2xl overflow-hidden shadow-lg border border-slate-800 text-white">
              
              <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Map className="w-4 h-4 text-sky-400" />
                  <span className="text-sm font-display font-semibold">Карта города «АвтоГрад»</span>
                </div>
                <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Масштаб 100px = 1.5км</span>
              </div>

              {/* Map Canvas */}
              <div className="relative bg-slate-950 h-64 border-b border-slate-800">
                <svg
                  onClick={handleMapClick}
                  className="w-full h-full cursor-crosshair select-none"
                  viewBox="0 0 600 400"
                >
                  {/* Decorative Grid Lines */}
                  <defs>
                    <pattern id="grid" width="30" height="30" patternUnits="userSpaceOnUse">
                      <path d="M 30 0 L 0 0 0 30" fill="none" stroke="#1e293b" strokeWidth="0.5" />
                    </pattern>
                  </defs>
                  <rect width="100%" height="100%" fill="url(#grid)" />

                  {/* Soft Green Parks */}
                  <rect x="50" y="40" width="120" height="70" rx="10" fill="#064e3b" opacity="0.4" />
                  <rect x="350" y="280" width="180" height="90" rx="15" fill="#064e3b" opacity="0.4" />

                  {/* Soft River winding through */}
                  <path
                    d="M 0,280 C 150,280 250,210 320,160 C 390,110 420,50 600,20"
                    fill="none"
                    stroke="#0369a1"
                    strokeWidth="16"
                    opacity="0.3"
                  />
                  <path
                    d="M 0,280 C 150,280 250,210 320,160 C 390,110 420,50 600,20"
                    fill="none"
                    stroke="#0284c7"
                    strokeWidth="8"
                    opacity="0.5"
                  />

                  {/* City Streets / Roads */}
                  <line x1="0" y1="180" x2="600" y2="180" stroke="#334155" strokeWidth="6" />
                  <line x1="250" y1="0" x2="250" y2="400" stroke="#334155" strokeWidth="6" />
                  <line x1="450" y1="0" x2="450" y2="400" stroke="#334155" strokeWidth="6" />
                  <line x1="0" y1="300" x2="600" y2="300" stroke="#334155" strokeWidth="4" />

                  {/* Intersections dots */}
                  <circle cx="250" cy="180" r="5" fill="#475569" />
                  <circle cx="450" cy="180" r="5" fill="#475569" />

                  {/* Workshop Marker Pins */}
                  {workshops.map((w) => {
                    const isHovered = hoveredWorkshopId === w.id;
                    const isSelected = selectedWorkshopId === w.id;
                    return (
                      <g
                        key={w.id}
                        className="cursor-pointer transition-all duration-300"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedWorkshopId(w.id);
                        }}
                        onMouseEnter={() => setHoveredWorkshopId(w.id)}
                        onMouseLeave={() => setHoveredWorkshopId(null)}
                      >
                        {/* Hover Ring */}
                        {(isHovered || isSelected) && (
                          <circle
                            cx={w.location.x}
                            cy={w.location.y}
                            r="18"
                            fill={isSelected ? "#0ea5e9" : "#475569"}
                            opacity="0.3"
                            className="animate-pulse"
                          />
                        )}
                        {/* Base pin */}
                        <circle
                          cx={w.location.x}
                          cy={w.location.y}
                          r="8"
                          fill={isSelected ? "#0ea5e9" : "#ef4444"}
                          stroke="#ffffff"
                          strokeWidth="2"
                        />
                        {/* Inner tag text */}
                        <text
                          x={w.location.x}
                          y={w.location.y - 12}
                          textAnchor="middle"
                          fill="#ffffff"
                          fontSize="10"
                          fontWeight="bold"
                          className="bg-slate-900 px-1 py-0.5 rounded shadow pointer-events-none"
                        >
                          {w.name}
                        </text>
                      </g>
                    );
                  })}

                  {/* User Active Location Marker (Pulsing ring + Icon) */}
                  <g className="pointer-events-none">
                    <circle
                      cx={userLocation.x}
                      cy={userLocation.y}
                      r="22"
                      fill="#0284c7"
                      opacity="0.25"
                      className="animate-pulse-ring"
                    />
                    <circle
                      cx={userLocation.x}
                      cy={userLocation.y}
                      r="12"
                      fill="#0284c7"
                      opacity="0.4"
                    />
                    {/* Tiny car silhouette or icon */}
                    <circle
                      cx={userLocation.x}
                      cy={userLocation.y}
                      r="6"
                      fill="#ffffff"
                    />
                  </g>
                </svg>

                {/* Relocating hint flash */}
                {isRelocating && (
                  <div className="absolute inset-0 bg-sky-500/10 flex items-center justify-center transition-all">
                    <div className="bg-slate-900/90 border border-sky-400 px-3 py-1 text-xs rounded-full flex items-center gap-1 animate-bounce">
                      <Navigation className="w-3.5 h-3.5 text-sky-400 rotate-45" />
                      <span>GPS Координаты обновлены...</span>
                    </div>
                  </div>
                )}
              </div>

              <div className="p-3 text-[11px] text-slate-400 text-center flex items-center justify-center gap-2">
                <Navigation className="w-3 h-3 text-sky-400 rotate-45" />
                <span>Кликните на карту, чтобы переставить ваше авто</span>
              </div>
            </div>

            {/* DETAILED EXPANDED WORKSHOP DETAILS & REVIEWS */}
            {selectedWorkshop ? (
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 flex flex-col gap-4 animate-fade-in">
                
                {/* Header info */}
                <div className="flex items-start justify-between border-b border-slate-100 pb-3">
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Выбранный автосервис</span>
                    <h3 className="text-lg font-display font-bold text-slate-900 leading-tight">{selectedWorkshop.name}</h3>
                    <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                      <span>{selectedWorkshop.address}</span>
                    </p>
                  </div>
                  <div className="flex items-center gap-1 bg-amber-50 px-2 py-1 rounded-lg border border-amber-200">
                    <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-500" />
                    <span className="text-xs font-bold text-amber-800">{selectedWorkshop.rating}</span>
                  </div>
                </div>

                {/* Fast contact actions */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <a
                    href={`tel:${selectedWorkshop.phone}`}
                    className="bg-slate-50 hover:bg-slate-100 text-slate-700 font-semibold p-2.5 rounded-xl border border-slate-200 flex items-center justify-center gap-2 transition-all"
                  >
                    <Phone className="w-4 h-4 text-sky-500" />
                    <span>Позвонить</span>
                  </a>
                  <button
                    onClick={() => {
                      setBookingWorkshop(selectedWorkshop);
                      setBookingService(selectedWorkshop.specialties[0] || "Диагностика");
                    }}
                    className="bg-slate-900 hover:bg-slate-800 text-white font-semibold p-2.5 rounded-xl flex items-center justify-center gap-2 transition-all"
                  >
                    <Calendar className="w-4 h-4 text-sky-400" />
                    <span>Запись</span>
                  </button>
                </div>

                {/* Specialties & description */}
                <div className="text-xs text-slate-600 space-y-2 border-b border-slate-50 pb-3">
                  <p className="leading-relaxed font-sans">{selectedWorkshop.description}</p>
                  <div className="flex flex-wrap gap-1 pt-1">
                    {selectedWorkshop.specialties.map((spec) => (
                      <span key={spec} className="bg-slate-50 text-slate-600 px-2 py-0.5 rounded border border-slate-200">
                        {spec}
                      </span>
                    ))}
                  </div>
                </div>

                {/* REVIEWS SEGMENT */}
                <div>
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2.5 flex items-center justify-between">
                    <span>Отзывы клиентов ({selectedWorkshop.reviews.length})</span>
                    <span className="text-sky-500 text-[10px] font-semibold bg-sky-50 px-2 py-0.5 rounded">Средний балл: {selectedWorkshop.rating}★</span>
                  </h4>

                  <div className="space-y-3 max-h-56 overflow-y-auto pr-1">
                    {selectedWorkshop.reviews.map((r) => (
                      <div key={r.id} className="bg-slate-50/50 p-3 rounded-xl border border-slate-150 text-xs flex flex-col gap-1.5">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-800">{r.author}</span>
                          <span className="text-[10px] text-slate-400 font-mono">{r.date}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="bg-slate-100 text-[10px] text-slate-600 px-1.5 py-0.5 rounded font-medium">{r.carModel}</span>
                          <div className="flex text-amber-400">
                            {Array.from({ length: 5 }).map((_, i) => (
                              <Star
                                key={i}
                                className={`w-3 h-3 ${i < r.rating ? "fill-amber-400 text-amber-400" : "text-slate-200"}`}
                              />
                            ))}
                          </div>
                        </div>
                        <p className="text-slate-600 leading-relaxed italic">"{r.text}"</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* WRITE A REVIEW FORM */}
                <form onSubmit={handleAddReview} className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs flex flex-col gap-3">
                  <h5 className="font-semibold text-slate-800 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-sky-500" />
                    <span>Поделиться опытом визита</span>
                  </h5>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-slate-500 mb-1">Имя:</label>
                      <input
                        type="text"
                        required
                        placeholder="Алексей"
                        value={newReviewAuthor}
                        onChange={(e) => setNewReviewAuthor(e.target.value)}
                        className="w-full p-2 bg-white rounded border border-slate-200 focus:ring-1 focus:ring-sky-500"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-500 mb-1">Ваш авто:</label>
                      <input
                        type="text"
                        required
                        placeholder="Kia Focus"
                        value={newReviewCar}
                        onChange={(e) => setNewReviewCar(e.target.value)}
                        className="w-full p-2 bg-white rounded border border-slate-200 focus:ring-1 focus:ring-sky-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-slate-500 mb-1">Ваша оценка:</label>
                    <div className="flex gap-2 items-center">
                      {[1, 2, 3, 4, 5].map((stars) => (
                        <button
                          key={stars}
                          type="button"
                          onClick={() => setNewReviewRating(stars)}
                          className="hover:scale-110 transition-transform"
                        >
                          <Star
                            className={`w-5 h-5 ${
                              stars <= newReviewRating
                                ? "fill-amber-400 text-amber-500"
                                : "text-slate-300"
                            }`}
                          />
                        </button>
                      ))}
                      <span className="font-bold text-slate-700 ml-1">{newReviewRating} / 5</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-slate-500 mb-1">Текст отзыва:</label>
                    <textarea
                      required
                      placeholder="Опишите, что вам понравилось или не понравилось..."
                      rows={2}
                      value={newReviewText}
                      onChange={(e) => setNewReviewText(e.target.value)}
                      className="w-full p-2 bg-white rounded border border-slate-200 focus:ring-1 focus:ring-sky-500 resize-none"
                    ></textarea>
                  </div>

                  {reviewError && <p className="text-rose-500 font-semibold">{reviewError}</p>}

                  <button
                    type="submit"
                    className="w-full bg-slate-900 hover:bg-slate-800 text-white font-semibold py-2 rounded-lg transition-all"
                  >
                    Опубликовать отзыв
                  </button>
                </form>
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-slate-200 p-6 text-center text-slate-400 shadow-sm">
                <MapPin className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                <h4 className="text-sm font-semibold text-slate-700">СТО не выбрана</h4>
                <p className="text-xs text-slate-400 mt-1">Кликните на карточку мастерской или на булавку на карте города, чтобы увидеть контакты и отзывы.</p>
              </div>
            )}
          </section>
        </div>
      </main>

      {/* BOOKING MODAL */}
      {bookingWorkshop && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-100 max-w-md w-full p-6 relative animate-scale-up">
            
            <button
              onClick={() => setBookingWorkshop(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            {bookingSuccess ? (
              <div className="py-8 text-center flex flex-col items-center justify-center gap-3">
                <div className="p-3 bg-emerald-100 text-emerald-600 rounded-full animate-bounce">
                  <Check className="w-8 h-8" />
                </div>
                <h3 className="text-lg font-bold text-slate-900">Заявка успешно создана!</h3>
                <p className="text-sm text-slate-500">
                  Мы отправили запрос в <strong>{bookingWorkshop.name}</strong>. Вы можете отслеживать статус во вкладке «Мои записи».
                </p>
              </div>
            ) : (
              <form onSubmit={handleBookingSubmit} className="flex flex-col gap-4">
                <div>
                  <span className="text-[10px] text-sky-600 uppercase tracking-wider font-bold">Бронирование визита</span>
                  <h3 className="text-lg font-bold text-slate-900 mt-0.5">{bookingWorkshop.name}</h3>
                  <p className="text-xs text-slate-500 mt-0.5">{bookingWorkshop.address}</p>
                </div>

                <div className="border-t border-slate-100 pt-3 flex flex-col gap-3">
                  
                  {/* Car info row */}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1">Марка/Модель авто:</label>
                      <input
                        type="text"
                        required
                        placeholder="Kia Rio"
                        value={bookingCarModel}
                        onChange={(e) => setBookingCarModel(e.target.value)}
                        className="w-full p-2 text-sm bg-slate-50 rounded border border-slate-200 focus:ring-1 focus:ring-sky-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1">Госномер авто (необ.):</label>
                      <input
                        type="text"
                        placeholder="А777АА 178"
                        value={bookingCarPlate}
                        onChange={(e) => setBookingCarPlate(e.target.value)}
                        className="w-full p-2 text-sm bg-slate-50 rounded border border-slate-200 focus:ring-1 focus:ring-sky-500 font-mono"
                      />
                    </div>
                  </div>

                  {/* Service selection */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">Тип ремонта/услуги:</label>
                    <select
                      value={bookingService}
                      onChange={(e) => setBookingService(e.target.value)}
                      className="w-full p-2 text-sm bg-slate-50 rounded border border-slate-200 focus:ring-1 focus:ring-sky-500"
                    >
                      {bookingWorkshop.specialties.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                      <option value="Диагностика">Общая диагностика и осмотр</option>
                      <option value="Другое">Другие работы (укажите в описании)</option>
                    </select>
                  </div>

                  {/* Date and Time slots */}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1">Удобная дата:</label>
                      <input
                        type="date"
                        required
                        min={new Date().toISOString().split("T")[0]}
                        value={bookingDate}
                        onChange={(e) => setBookingDate(e.target.value)}
                        className="w-full p-2 text-sm bg-slate-50 rounded border border-slate-200 focus:ring-1 focus:ring-sky-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1">Время записи:</label>
                      <select
                        value={bookingTime}
                        onChange={(e) => setBookingTime(e.target.value)}
                        className="w-full p-2 text-sm bg-slate-50 rounded border border-slate-200 focus:ring-1 focus:ring-sky-500 font-mono"
                      >
                        {["09:00", "10:00", "11:30", "13:00", "14:30", "16:00", "17:30", "19:00"].map((t) => (
                          <option key={t} value={t}>{t}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Comment */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">Комментарии (неисправность):</label>
                    <textarea
                      placeholder="Опишите в двух словах проблему, например: стерлись тормоза, свистит ремень..."
                      rows={2}
                      value={bookingComment}
                      onChange={(e) => setBookingComment(e.target.value)}
                      className="w-full p-2 text-xs bg-slate-50 rounded border border-slate-200 focus:ring-1 focus:ring-sky-500 resize-none"
                    ></textarea>
                  </div>

                  {/* Prices indicators */}
                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-150 text-[11px] text-slate-500">
                    <span className="block font-semibold text-slate-700 mb-1 uppercase tracking-wider text-[9px]">Информация о ценах:</span>
                    <div className="flex justify-between">
                      <span>Стоимость диагностики:</span>
                      <strong className="text-slate-800 font-mono">{bookingWorkshop.priceEstimate.diagnostics} ₽</strong>
                    </div>
                    <div className="flex justify-between">
                      <span>Средний нормо-час:</span>
                      <strong className="text-slate-800 font-mono">{bookingWorkshop.priceEstimate.hourlyRate} ₽ / ч</strong>
                    </div>
                  </div>

                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setBookingWorkshop(null)}
                    className="flex-1 py-2 text-sm font-semibold rounded-xl border border-slate-250 hover:bg-slate-50 text-slate-700"
                  >
                    Отмена
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2 text-sm font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-xl"
                  >
                    Подтвердить запись
                  </button>
                </div>
              </form>
            )}

          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="bg-slate-900 border-t border-slate-800 text-slate-400 py-6 mt-12 text-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2">
            <Wrench className="w-4 h-4 text-sky-500" />
            <span>&copy; {new Date().getFullYear()} AutoRemont Match. Все права защищены.</span>
          </div>
          <div className="flex gap-4">
            <span className="text-[10px] text-slate-500">Модель: gemini-3.5-flash | Версия 1.1.0</span>
            <a href="#" className="hover:text-white transition-colors">Политика конфиденциальности</a>
            <a href="#" className="hover:text-white transition-colors">Пользовательское соглашение</a>
          </div>
        </div>
      </footer>

    </div>
  );
}
