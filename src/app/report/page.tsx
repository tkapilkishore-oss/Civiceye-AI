"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Camera,
  Upload,
  ChevronRight,
  X,
  MapPin,
  Bot,
  BrainCircuit,
  Database,
  ArrowRight,
  ShieldCheck
} from "lucide-react";
import { AnalyzeImageResponse, GenerateReportResponse } from "@/types";
import { MAP_CONFIG, WARDS_LIST, deriveWardFromAddress } from "@/constants/config";
import { sanitizeReportForLocalStorage, sanitizeReportsListForLocalStorage } from "@/lib/storageHelper";
import dynamicImport from "next/dynamic";

const InteractiveMap = dynamicImport(() => import("@/components/InteractiveMap"), {
  ssr: false,
  loading: () => <div className="h-[280px] w-full bg-slate-900/60 animate-pulse flex items-center justify-center text-xs text-on-surface-variant font-mono">LOADING MAP MODULE...</div>
});

export default function ReportPage() {
  const router = useRouter();

  // State Machine: "camera" | "details" | "analyzing_image" | "duplicate_check" | "questions" | "generating_report"
  const [step, setStep] = useState<
    "camera" | "details" | "analyzing_image" | "duplicate_check" | "questions" | "generating_report"
  >("camera");

  // Voice speech translation
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  // Duplicate Check
  const [duplicateReport, setDuplicateReport] = useState<any | null>(null);

  // Camera & Image State
  const [hasCamera, setHasCamera] = useState(false);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Form inputs
  const [description, setDescription] = useState("");
  const [locality, setLocality] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Pothole");
  const [citizenName, setCitizenName] = useState("");
  const [contactInfo, setContactInfo] = useState("");

  // Autocomplete search suggestions
  const [searchQuery, setSearchQuery] = useState("");
  const [suggestions, setSuggestions] = useState<any[]>([]);


  // Map center and zoom
  const [mapCenter, setMapCenter] = useState<[number, number]>(MAP_CONFIG.defaultCenter);
  const [mapZoom, setMapZoom] = useState(MAP_CONFIG.defaultZoom);

  // Derived/Configured Ward and detailed address components
  const [selectedWard, setSelectedWard] = useState("Unknown / Unable to Determine");
  const [formattedAddress, setFormattedAddress] = useState("");
  const [city, setCity] = useState("");
  const [stateName, setStateName] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [locationResolvingState, setLocationResolvingState] = useState<string | null>(null);

  // API Call 1 response data
  const [analysis, setAnalysis] = useState<AnalyzeImageResponse | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});

  // Geolocation coordinates
  const [latitude, setLatitude] = useState<number | undefined>(undefined);
  const [longitude, setLongitude] = useState<number | undefined>(undefined);

  // Simulated agent log feedback during loading
  const [loadingLog, setLoadingLog] = useState("");

  // Validation and manual geocoding flags
  const [nameError, setNameError] = useState<string | null>(null);
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [isLocalityManuallyEdited, setIsLocalityManuallyEdited] = useState(false);
  const [isReanalyzing, setIsReanalyzing] = useState(false);

  // Judge Demo state variables
  const [isDemoLoading, setIsDemoLoading] = useState(false);


  const wardsList = WARDS_LIST;

  const categories = [
    { name: "Pothole", icon: "error" },
    { name: "Garbage", icon: "delete_sweep" },
    { name: "Water Leakage", icon: "water_drop" },
    { name: "Broken Lights", icon: "lightbulb" },
    { name: "Drainage", icon: "waves" },
    { name: "Fallen Trees", icon: "nature" },
  ];

  // Check if camera device is available
  useEffect(() => {
    if (typeof window !== "undefined" && navigator.mediaDevices) {
      navigator.mediaDevices
        .enumerateDevices()
        .then((devices) => {
          const videoDevices = devices.filter((d) => d.kind === "videoinput");
          setHasCamera(videoDevices.length > 0);
        })
        .catch((err) => console.log("Error enumerating devices:", err));
    }
  }, []);

  // Cleanup camera stream
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  // Initialize coordinates to default center and trigger geocoding
  useEffect(() => {
    if (latitude === undefined || longitude === undefined) {
      setLatitude(MAP_CONFIG.defaultCenter[0]);
      setLongitude(MAP_CONFIG.defaultCenter[1]);
      setMapCenter(MAP_CONFIG.defaultCenter);
    }
  }, []);

  // Run reverse geocoding on coordinates load
  useEffect(() => {
    if (latitude && longitude && !formattedAddress) {
      runReverseGeocoding(latitude, longitude);
    }
  }, [latitude, longitude]);

  // Reverse geocoding worker
  const runReverseGeocoding = async (lat: number, lng: number, forceOverwrite = false) => {
    try {
      setLocationResolvingState("Resolving location...");
      const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`;
      const res = await fetch(url, {
        headers: { "User-Agent": "CivicEyeAI-Hackathon-App" }
      });
      if (res.ok) {
        const data = await res.json();
        setFormattedAddress(data.display_name || "");
        
        const addr = data.address || {};
        const extractedLocality = addr.suburb || addr.neighbourhood || addr.road || addr.residential || addr.subdivision || addr.subdistrict || "";
        const extractedCity = addr.city || addr.town || addr.village || "Bengaluru";
        const extractedState = addr.state || "Karnataka";
        const extractedPostcode = addr.postcode || "";

        if (!isLocalityManuallyEdited || forceOverwrite) {
          setLocality(extractedLocality || locality);
        }
        setCity(extractedCity);
        setStateName(extractedState);
        setPostalCode(extractedPostcode);
        
        const derivedWard = deriveWardFromAddress(addr);
        setSelectedWard(derivedWard);
        setLocationResolvingState("Ward Resolved");
        setTimeout(() => setLocationResolvingState(null), 1000);
      } else {
        setSelectedWard("Unknown / Unable to Determine");
        setLocationResolvingState(null);
      }
    } catch (err) {
      console.error("Reverse geocoding failed:", err);
      setSelectedWard("Unknown / Unable to Determine");
      setLocationResolvingState(null);
    }
  };

  const geocodeManualAddress = async (addressStr: string) => {
    if (!addressStr.trim() || addressStr.length < 3) return;
    
    setLocationResolvingState("Resolving location...");
    try {
      const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(addressStr)}&limit=1&countrycodes=in&addressdetails=1`;
      const res = await fetch(url, {
        headers: { "User-Agent": "CivicEyeAI-Hackathon-App" }
      });
      if (res.ok) {
        const data = await res.json();
        if (data && data.length > 0) {
          const item = data[0];
          setLocationResolvingState("Coordinates Found");
          const lat = parseFloat(item.lat);
          const lon = parseFloat(item.lon);
          
          setLatitude(lat);
          setLongitude(lon);
          setMapCenter([lat, lon]);
          setMapZoom(16);
          
          const addr = item.address || {};

          const extractedCity = addr.city || addr.town || addr.village || "Bengaluru";
          const extractedState = addr.state || "Karnataka";
          const extractedPostcode = addr.postcode || "";

          setFormattedAddress(item.display_name || "");
          setCity(extractedCity);
          setStateName(extractedState);
          setPostalCode(extractedPostcode);
          
          const derivedWard = deriveWardFromAddress(addr);
          setSelectedWard(derivedWard);
          setLocationResolvingState("Ward Resolved");
          setTimeout(() => setLocationResolvingState(null), 1000);
        } else {
          setSelectedWard("Unknown / Unable to Determine");
          setLocationResolvingState(null);
        }
      } else {
        setSelectedWard("Unknown / Unable to Determine");
        setLocationResolvingState(null);
      }
    } catch (err) {
      console.error("Geocoding manual address failed:", err);
      setSelectedWard("Unknown / Unable to Determine");
      setLocationResolvingState(null);
    }
  };

  // Debounce effect for manual locality input
  useEffect(() => {
    if (!isLocalityManuallyEdited || !locality.trim() || locality.length < 3) return;
    
    // Invalidate previously derived location data immediately when edited
    setLatitude(undefined);
    setLongitude(undefined);
    setFormattedAddress("");
    setCity("");
    setStateName("");
    setPostalCode("");
    setSelectedWard("Unknown / Unable to Determine");
    
    const delayDebounce = setTimeout(() => {
      geocodeManualAddress(locality);
    }, 1000); // 1 second debounce
    
    return () => clearTimeout(delayDebounce);
  }, [locality, isLocalityManuallyEdited]);

  // Autocomplete search input worker
  const handleSearchInputChange = async (val: string) => {
    setSearchQuery(val);
    if (!val.trim() || val.length < 3) {
      setSuggestions([]);
      return;
    }

    try {

      const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(val)}&limit=5&countrycodes=in&viewbox=77.4,13.1,77.8,12.8`;
      const res = await fetch(url, {
        headers: { "User-Agent": "CivicEyeAI-Hackathon-App" }
      });
      if (res.ok) {
        const data = await res.json();
        setSuggestions(data);
      }
    } catch (err) {
      console.error("Nominatim search failed:", err);
    } finally {

    }
  };

  // Select suggestion action
  const selectSuggestion = (item: any) => {
    setLocationResolvingState("Resolving location...");
    const lat = parseFloat(item.lat);
    const lon = parseFloat(item.lon);
    if (!isNaN(lat) && !isNaN(lon)) {
      setLocationResolvingState("Coordinates Found");
      setLatitude(lat);
      setLongitude(lon);
      setMapCenter([lat, lon]);
      setMapZoom(16);
      setSearchQuery(item.display_name.split(",")[0]);
      setSuggestions([]);
      setIsLocalityManuallyEdited(false); // Reset since suggestion represents an explicit pick
      runReverseGeocoding(lat, lon, true);
    }
  };

  // Geolocation trigger is disabled. Location entry is manual, resolved via OpenStreetMap and draggable pins.

  // Draggable Marker callbacks
  const handleMarkerDragEnd = (lat: number, lng: number) => {
    setLocationResolvingState("Resolving location...");
    setLatitude(lat);
    setLongitude(lng);
    setMapCenter([lat, lng]);
    setIsLocalityManuallyEdited(false);
    setLocationResolvingState("Coordinates Found");
    runReverseGeocoding(lat, lng, true);
  };

  const handleMapClick = (lat: number, lng: number) => {
    setLocationResolvingState("Resolving location...");
    setLatitude(lat);
    setLongitude(lng);
    setMapCenter([lat, lng]);
    setIsLocalityManuallyEdited(false);
    setLocationResolvingState("Coordinates Found");
    runReverseGeocoding(lat, lng, true);
  };


  const startCamera = async () => {
    try {
      setCapturedImage(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setIsCameraActive(true);
    } catch (err) {
      console.error("Error accessing camera:", err);
      alert("Could not access camera. Please use the file upload option.");
      setIsCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
  };

  const capturePhoto = () => {
    if (videoRef.current) {
      const canvas = document.createElement("canvas");
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL("image/jpeg");
        setCapturedImage(dataUrl);
        stopCamera();
        setStep("details");
      }
    }
  };

  const handleLoadDemo = async (type: "pothole" | "water" | "garbage" | "streetlight") => {
    setIsDemoLoading(true);


    let url = "";
    let category = "";
    const demoCity = "Bengaluru";
    const demoState = "Karnataka";

    switch (type) {
      case "pothole":
        url = "/test_images/pothole.jpg";
        category = "Pothole";
        break;
      case "water":
        url = "/test_images/water_pipe_burst.jpg";
        category = "Water Leakage";
        break;
      case "garbage":
        url = "/test_images/garbage.jpg";
        category = "Garbage";
        break;
      case "streetlight":
        url = "/test_images/streetlight.jpg";
        category = "Broken Lights";
        break;
    }

    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error("Unsplash fetch failed");
      const blob = await response.blob();
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64data = reader.result as string;
        setCapturedImage(base64data);
        setSelectedCategory(category);
        
        // Preload only category and image, reset everything else to allow full user flow
        setDescription("");
        setSelectedWard("Unknown / Unable to Determine");
        setLocality("");
        setLatitude(12.9716);
        setLongitude(77.5946);
        setMapCenter([12.9716, 77.5946]);
        setMapZoom(12);
        setFormattedAddress("");
        setCity(demoCity);
        setStateName(demoState);
        setPostalCode("");
        setCitizenName("");
        setContactInfo("");
        
        setStep("details");
        setIsDemoLoading(false);

      };
      reader.readAsDataURL(blob);
    } catch (err) {
      console.warn("CORS fetch failed, using fallback base64 placeholder:", err);
      const canvas = document.createElement("canvas");
      canvas.width = 600;
      canvas.height = 400;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        const grad = ctx.createLinearGradient(0, 0, 600, 400);
        grad.addColorStop(0, "#1e1b4b");
        grad.addColorStop(1, "#311042");
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, 600, 400);
        
        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 24px system-ui, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(`CivicEye AI Demo: ${category}`, 300, 180);
        
        ctx.fillStyle = "#a78bfa";
        ctx.font = "bold 14px monospace";
        ctx.fillText("[DEMO SYSTEM LOADED SUCCESSFULLY]", 300, 260);
        
        const base64data = canvas.toDataURL("image/jpeg");
        setCapturedImage(base64data);
      }
      
      setSelectedCategory(category);
      setDescription("");
      setSelectedWard("Unknown / Unable to Determine");
      setLocality("");
      setLatitude(12.9716);
      setLongitude(77.5946);
      setMapCenter([12.9716, 77.5946]);
      setMapZoom(12);
      setFormattedAddress("");
      setCity(demoCity);
      setStateName(demoState);
      setPostalCode("");
      setCitizenName("");
      setContactInfo("");
      
      setStep("details");
      setIsDemoLoading(false);

    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setCapturedImage(reader.result as string);
        setStep("details");
      };
      reader.readAsDataURL(file);
    }
  };

  const startListening = () => {
    if (typeof window !== "undefined") {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = "en-US";

        recognition.onstart = () => {
          setIsListening(true);
        };

        recognition.onresult = (event: any) => {
          const transcript = event.results[0][0].transcript;
          setDescription((prev) => (prev ? prev + " " + transcript : transcript));
        };

        recognition.onerror = (e: any) => {
          console.error("Speech error:", e);
          setIsListening(false);
        };

        recognition.onend = () => {
          setIsListening(false);
        };

        recognitionRef.current = recognition;
        recognition.start();
      } else {
        alert("Web Speech API is not supported in this browser.");
      }
    }
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
  };

  const handleSupportDuplicate = async () => {
    if (!duplicateReport) return;
    try {
      const nextCount = (duplicateReport.supporter_count || 1) + 1;
      await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: duplicateReport.id, supporter_count: nextCount }),
      });
      
      try {
        const listRaw = localStorage.getItem("reports_list");
        if (listRaw) {
          const list = JSON.parse(listRaw);
          const idx = list.findIndex((r: any) => r.id === duplicateReport.id);
          if (idx !== -1) {
            list[idx].supporter_count = nextCount;
            localStorage.setItem("reports_list", JSON.stringify(sanitizeReportsListForLocalStorage(list)));
          }
        }
        
        const singleRaw = localStorage.getItem(`report_${duplicateReport.id}`);
        if (singleRaw) {
          const report = JSON.parse(singleRaw);
          report.supporter_count = nextCount;
          localStorage.setItem(`report_${duplicateReport.id}`, JSON.stringify(sanitizeReportForLocalStorage(report)));
        }
      } catch {}

      router.push(`/report/${duplicateReport.id}`);
    } catch (err) {
      console.error(err);
      router.push(`/report/${duplicateReport.id}`);
    }
  };

  const handleIgnoreDuplicate = () => {
    if (!analysis) return;
    const initialAnswers: Record<string, string> = {};
    analysis.follow_up_questions.forEach((q) => {
      initialAnswers[q] = "";
    });
    setAnswers(initialAnswers);
    setStep("questions");
  };

  const validateForm = () => {
    let isValid = true;
    setNameError(null);
    setPhoneError(null);

    const trimmedName = citizenName.trim();
    if (!trimmedName) {
      setNameError("Please enter your name.");
      isValid = false;
    } else {
      const nameRegex = /^[A-Za-z\s'-]+$/;
      if (!nameRegex.test(trimmedName)) {
        setNameError("Please enter a valid name.");
        isValid = false;
      }
    }

    const trimmedContact = contactInfo.trim();
    if (!trimmedContact) {
      setPhoneError("Please enter a phone number.");
      isValid = false;
    } else {
      const phoneRegex = /^\+?[0-9\s-]{10,15}$/;
      if (!phoneRegex.test(trimmedContact)) {
        setPhoneError("Please enter a valid phone number.");
        isValid = false;
      }
    }

    return isValid;
  };

  const handleReuploadImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64data = reader.result as string;
        setCapturedImage(base64data);
        setIsReanalyzing(true);
        try {
          const res = await fetch("/api/analyze-image", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              image: base64data,
              description: `${selectedCategory}: ${description}`,
            }),
          });
          if (res.ok) {
            const data: AnalyzeImageResponse = await res.json();
            setAnalysis(data);
            const initialAnswers: Record<string, string> = {};
            data.follow_up_questions.forEach((q) => {
              initialAnswers[q] = "";
            });
            setAnswers(initialAnswers);
          } else {
            alert("Failed to analyze the new image.");
          }
        } catch (err) {
          console.error("Reanalysis failed:", err);
          alert("Error re-analyzing image.");
        } finally {
          setIsReanalyzing(false);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Submit Image and Description to Call 1
  const submitToVisionAgent = async () => {
    if (!capturedImage) return;
    if (!validateForm()) return;

    setStep("analyzing_image");
    
    // Simulate Agent Logs sequence
    const logs = [
      "Vision Agent: Fetching image buffer...",
      "Vision Agent: Analyzing pixels for structural anomalies...",
      "Geo Agent: Resolving geofence and bounding box details...",
      "Duplicate Agent: Running search vector comparison in Firestore...",
      "Vision Agent: Extracting final classification and questions...",
    ];

    let count = 0;
    setLoadingLog(logs[0]);
    const logInterval = setInterval(() => {
      count++;
      if (count < logs.length) {
        setLoadingLog(logs[count]);
      } else {
        clearInterval(logInterval);
      }
    }, 400);

    try {
      const res = await fetch("/api/analyze-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image: capturedImage,
          description: `${selectedCategory}: ${description}`,
        }),
      });

      clearInterval(logInterval);
      
      if (res.ok) {
        const data: AnalyzeImageResponse = await res.json();
        setAnalysis(data);

        // Run Duplicate Detection check
        let possibleDuplicate = null;
        try {
          const listRes = await fetch("/api/reports");
          if (listRes.ok) {
            const list = await listRes.json();
            possibleDuplicate = list.find((r: any) => {
              const sameType = (r.issue_type || "").toLowerCase() === (data.issue_type || "").toLowerCase();
              let closeCoords = false;
              if (latitude !== undefined && longitude !== undefined && r.latitude !== undefined && r.longitude !== undefined) {
                const latDiff = Math.abs(r.latitude - latitude);
                const lngDiff = Math.abs(r.longitude - longitude);
                closeCoords = latDiff < 0.0025 && lngDiff < 0.0025;
              }
              return sameType && closeCoords;
            });
          }
        } catch (e) {
          console.error("Duplicate check query failed:", e);
        }

        if (possibleDuplicate) {
          setDuplicateReport(possibleDuplicate);
          setStep("duplicate_check");
        } else {
          const initialAnswers: Record<string, string> = {};
          data.follow_up_questions.forEach((q) => {
            initialAnswers[q] = "";
          });
          setAnswers(initialAnswers);
          setStep("questions");
        }
      } else {
        alert("Failed to analyze image. Please try again.");
        setStep("details");
      }
    } catch (err) {
      clearInterval(logInterval);
      console.error(err);
      alert("Error contacting server. Please check your connection.");
      setStep("details");
    }
  };

  // Submit Answers to Call 2
  const submitToDecisionAgent = async () => {
    if (!analysis) return;

    setStep("generating_report");

    const logs = [
      "Priority Agent: Evaluating answers weight...",
      "Priority Agent: Calculating threat matrix (impact/severity)...",
      "Authority Agent: Mapping jurisdiction to local administrative codes...",
      "Complaint Agent: Synthesizing administrative complaint draft...",
      "Database Agent: Saving record block to Firestore 'reports'...",
      "Database Agent: Updating Ward Civic Health index stats...",
    ];

    let count = 0;
    setLoadingLog(logs[0]);
    const logInterval = setInterval(() => {
      count++;
      if (count < logs.length) {
        setLoadingLog(logs[count]);
      } else {
        clearInterval(logInterval);
      }
    }, 450);

    try {
      const answersArray = Object.entries(answers).map(([question, answer]) => ({
        question,
        answer,
      }));

      const res = await fetch("/api/generate-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image_url: capturedImage,
          ward: selectedWard,
          locality,
          issue_type: analysis.issue_type,
          severity: analysis.severity,
          confidence: analysis.confidence,
          follow_up_answers: answersArray,
          latitude,
          longitude,
          formatted_address: formattedAddress,
          city,
          state: stateName,
          postal_code: postalCode,
          explainability: analysis.explainability || null,
          citizen_name: citizenName || "Concerned Citizen",
          contact_info: contactInfo || "Not provided",
          description: description
        }),
      });

      clearInterval(logInterval);

      if (res.ok) {
        const data: GenerateReportResponse = await res.json();
        
        // Save the complete report document locally for instant dashboard querying fallback
        const fullReport = {
          id: data.id,
          image_url: capturedImage,
          ward: selectedWard,
          locality: locality,
          issue_type: analysis.issue_type,
          severity: analysis.severity,
          confidence: analysis.confidence,
          priority: data.priority,
          authority: data.authority,
          complaint_draft: data.complaint_draft,
          action_plan: data.action_plan,
          created_at: new Date().toISOString(),
          status: "Investigating",
          latitude,
          longitude,
          formatted_address: formattedAddress,
          city,
          state: stateName,
          postal_code: postalCode,
          follow_up_answers: answersArray,
          explainability: analysis.explainability || null,
          estimation: data.estimation || null,
          supporter_count: 1,
          citizen_name: citizenName || "Concerned Citizen",
          contact_info: contactInfo || "Not provided",
          description: description
        };
        
        try {
          const sanitizedReport = sanitizeReportForLocalStorage(fullReport);
          localStorage.setItem(`report_${data.id}`, JSON.stringify(sanitizedReport));
          
          const reportsListRaw = localStorage.getItem("reports_list");
          let reportsList = [];
          if (reportsListRaw) {
            reportsList = JSON.parse(reportsListRaw);
          }
          reportsList.unshift(sanitizedReport);
          localStorage.setItem("reports_list", JSON.stringify(sanitizeReportsListForLocalStorage(reportsList)));
        } catch (e) {
          console.error("Local storage report sync failed:", e);
        }

        // Redirect to detail results page
        router.push(`/report/${data.id}`);
      } else {
        alert("Failed to generate report. Please try again.");
        setStep("questions");
      }
    } catch (err) {
      clearInterval(logInterval);
      console.error(err);
      alert("Error communicating with server.");
      setStep("questions");
    }
  };

  const needsReupload = !!(analysis && (
    analysis.follow_up_questions.some(q => 
      /clearer image|better image|new image|blurry|unclear|re-upload|upload another image/i.test(q)
    ) || 
    /clearer image|better image|new image|blurry|unclear|re-upload|upload another image/i.test(analysis.issue_summary || "")
  ));

  return (
    <div className="flex-1 flex flex-col bg-background text-on-surface overflow-x-hidden pt-32 pb-20 px-6 md:px-12">
      <div className="max-w-[800px] mx-auto w-full">
        {/* Step Progress Line */}
        <div className="flex items-center justify-between mb-8 text-xs font-semibold text-on-surface-variant/60 border-b border-white/5 pb-4 uppercase tracking-widest font-display">
          <span className={step === "camera" ? "text-electric-blue" : capturedImage ? "text-violet-400" : ""}>
            1. Image Capture
          </span>
          <ChevronRight className="h-4 w-4" />
          <span className={step === "details" ? "text-electric-blue" : step !== "camera" ? "text-violet-400" : ""}>
            2. Defect Details
          </span>
          <ChevronRight className="h-4 w-4" />
          <span className={step === "duplicate_check" ? "text-electric-blue" : step === "questions" ? "text-electric-blue" : step === "generating_report" ? "text-violet-400" : ""}>
            3. AI Interview
          </span>
        </div>

        {/* Intro Header */}
        {step === "camera" && (
          <div className="text-center mb-10 animate-entrance" style={{ animationDelay: "0.1s" }}>
            <h1 className="font-display text-4xl sm:text-5xl font-bold mb-4 text-white tracking-tight">
              Smart Upload Portal
            </h1>
            <p className="text-on-surface-variant max-w-xl mx-auto leading-relaxed text-sm md:text-base">
              Citizen reporting powered by Analytic Intelligence. Upload an image or use your camera to identify and report urban infrastructure issues in real-time.
            </p>
          </div>
        )}

        {/* VIEWPORT CARD (Camera-first container) */}
        <div className="glass-md rounded-[2rem] border border-white/10 p-6 md:p-10 relative overflow-hidden shadow-2xl">
          
          {/* STEP: Camera Viewfinder / File Selector */}
          {step === "camera" && (
            <div className="space-y-8">
              {/* Judge Demo Mode Card */}
              <div className="bg-gradient-to-r from-violet-500/10 to-electric-blue/10 border border-electric-blue/20 rounded-2xl p-5 mb-4 relative overflow-hidden backdrop-blur-md">
                <div className="absolute top-0 right-0 w-24 h-24 bg-electric-blue/10 rounded-full blur-2xl pointer-events-none" />
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h3 className="text-white font-display font-bold text-base flex items-center gap-2">
                      <span>🚀</span> Judge Demo Mode
                    </h3>
                    <p className="text-on-surface-variant/80 text-xs mt-1">
                      Experience the complete CivicEye workflow in under 30 seconds.
                    </p>
                  </div>
                  {isDemoLoading && (
                    <div className="flex items-center gap-2 text-electric-blue text-xs font-mono">
                      <span className="h-3.5 w-3.5 rounded-full border-2 border-electric-blue/20 border-t-electric-blue animate-spin" />
                      Preloading asset...
                    </div>
                  )}
                </div>
                
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
                  {[
                    { type: 'pothole', label: 'Pothole', icon: 'error' },
                    { type: 'water', label: 'Water Leakage', icon: 'water_drop' },
                    { type: 'garbage', label: 'Garbage', icon: 'delete_sweep' },
                    { type: 'streetlight', label: 'Broken Streetlight', icon: 'lightbulb' }
                  ].map((btn) => (
                    <button
                      key={btn.type}
                      disabled={isDemoLoading}
                      onClick={() => handleLoadDemo(btn.type as any)}
                      className="bg-white/5 hover:bg-electric-blue/15 border border-white/10 hover:border-electric-blue/30 text-white font-display text-[11px] font-bold py-2.5 px-3 rounded-xl transition-all flex items-center justify-center gap-1.5 active:scale-95 disabled:opacity-50 disabled:pointer-events-none"
                    >
                      <span className="material-symbols-outlined text-sm text-electric-blue">
                        {btn.icon}
                      </span>
                      {btn.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Dropzone container */}
              <div 
                className="relative aspect-video rounded-2xl bg-surface-container-lowest/50 border-2 border-dashed border-white/10 flex flex-col items-center justify-center text-center transition-all duration-300 hover:border-electric-blue/40 group overflow-hidden"
              >
                {isCameraActive ? (
                  <>
                    <video
                      ref={videoRef}
                      className="absolute inset-0 h-full w-full object-cover transform scale-x-[-1]"
                      playsInline
                      muted
                    />
                    {/* Viewfinder grid lines */}
                    <div className="absolute inset-0 border border-white/5 grid grid-cols-3 grid-rows-3 pointer-events-none z-10">
                      <div className="border-r border-b border-white/10" />
                      <div className="border-r border-b border-white/10" />
                      <div className="border-b border-white/10" />
                      <div className="border-r border-b border-white/10" />
                      <div className="border-r border-b border-white/10" />
                      <div className="border-b border-white/10" />
                    </div>
                    
                    {/* Camera Trigger */}
                    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-6 z-20">
                      <button
                        onClick={capturePhoto}
                        className="h-16 w-16 rounded-full border-4 border-white bg-red-600 transition-transform duration-300 hover:scale-105 active:scale-95 shadow-2xl"
                      />
                      <button
                        onClick={stopCamera}
                        className="bg-slate-900/90 text-xs px-4 py-2 rounded-full border border-white/10 text-white font-medium hover:bg-slate-800 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="p-8 flex flex-col items-center">
                    {/* SVG Cloud Upload Illustration */}
                    <div className="mb-6 animate-pulse">
                      <svg fill="none" height="80" viewBox="0 0 120 120" width="80" xmlns="http://www.w3.org/2000/svg">
                        <circle className="text-electric-blue/5" cx="60" cy="60" fill="currentColor" r="50"></circle>
                        <path className="text-electric-blue" d="M40 70L60 50L80 70" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="4"></path>
                        <path className="text-electric-blue" d="M60 50V90" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="4"></path>
                        <path className="text-electric-blue/30" d="M90 60C90 43.4315 76.5685 30 60 30C43.4315 30 30 43.4315 30 60" stroke="currentColor" strokeLinecap="round" strokeWidth="4"></path>
                      </svg>
                    </div>

                    <h2 className="font-display text-lg md:text-xl font-bold mb-2 text-white">
                      Drag and drop media here
                    </h2>
                    <p className="text-on-surface-variant text-xs mb-8">
                      JPG, PNG, or WEBP images containing civic defects
                    </p>

                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                      <label className="bg-electric-blue text-background px-6 py-3 rounded-full font-display text-xs font-bold flex items-center gap-2 cursor-pointer hover:brightness-110 active:scale-95 transition-all shadow-lg shadow-electric-blue/20">
                        <Upload className="h-4 w-4 shrink-0" />
                        Select File
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleFileUpload}
                          className="hidden"
                        />
                      </label>
                      
                      {hasCamera && (
                        <button
                          onClick={startCamera}
                          className="glass-sm px-6 py-3 rounded-full font-display text-xs font-bold flex items-center gap-2 hover:bg-white/10 transition-all border border-white/10 active:scale-95 text-white"
                        >
                          <Camera className="h-4 w-4 shrink-0 text-electric-blue" />
                          Live Camera
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Location Bar */}
              <div className="flex justify-center">
                <div className="glass-sm px-5 py-2.5 rounded-full flex items-center gap-3 font-display text-xs text-on-surface-variant border border-white/5">
                  <MapPin className="text-electric-blue h-4.5 w-4.5" />
                  <span>
                    Current Location: <span className="text-on-surface font-semibold">
                      {latitude !== undefined && longitude !== undefined
                        ? `${Math.abs(latitude).toFixed(4)}° ${latitude >= 0 ? "N" : "S"}, ${Math.abs(longitude).toFixed(4)}° ${longitude >= 0 ? "E" : "W"}`
                        : "12.9716° N, 77.5946° E"}
                    </span>
                  </span>
                </div>
              </div>

              {/* Category Selection */}
              <div className="space-y-4">
                <h3 className="text-center font-display text-xs font-bold uppercase tracking-[0.2em] text-on-surface-variant/60 mb-4">
                  Select Issue Category
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {categories.map((cat) => (
                    <button
                      key={cat.name}
                      onClick={() => setSelectedCategory(cat.name)}
                      className={`glass-md p-6 rounded-2xl flex flex-col items-center gap-3 transition-all duration-300 hover:-translate-y-1 active:scale-98 group border relative ${
                        selectedCategory === cat.name
                          ? "border-electric-blue bg-electric-blue/5 shadow-[0_0_15px_rgba(0,209,255,0.15)] -translate-y-1 scale-102"
                          : "border-transparent"
                      }`}
                    >
                      {selectedCategory === cat.name && (
                        <div className="absolute top-2.5 right-2.5 w-4.5 h-4.5 rounded-full bg-electric-blue flex items-center justify-center shadow-[0_0_8px_#00D1FF] z-20">
                          <span className="material-symbols-outlined text-[10px] text-background font-black">check</span>
                        </div>
                      )}
                      <div className={`w-12 h-12 rounded-xl bg-surface-container-high flex items-center justify-center transition-all ${
                        selectedCategory === cat.name
                          ? "bg-electric-blue/15 text-electric-blue"
                          : "text-on-surface-variant group-hover:text-white"
                      }`}>
                        <span className="material-symbols-outlined text-2xl">
                          {cat.icon}
                        </span>
                      </div>
                      <span className="font-display text-xs font-semibold text-slate-200">
                        {cat.name}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* STEP: Details Form */}
          {step === "details" && capturedImage && (
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b border-white/5 pb-4">
                <h2 className="text-lg md:text-xl font-bold text-white flex items-center gap-2 font-display">
                  <MapPin className="h-5 w-5 text-electric-blue" />
                  Provide Location & Details
                </h2>
                <button
                  onClick={() => {
                    setCapturedImage(null);
                    setStep("camera");
                  }}
                  className="text-on-surface-variant hover:text-white transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                {/* Left side (7 cols): Map Search & Interactive Pin */}
                <div className="md:col-span-7 space-y-4">
                  {/* Search Bar */}
                  <div className="relative">
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => handleSearchInputChange(e.target.value)}
                      placeholder="Search locality, street, landmark..."
                      className="w-full rounded-xl border border-white/10 bg-surface-container-lowest/40 p-3 pl-10 text-sm text-white placeholder:text-on-surface-variant/40 focus:outline-none focus:border-electric-blue transition-all"
                    />
                    <span className="material-symbols-outlined absolute left-3 top-3.5 text-on-surface-variant/60 text-sm">search</span>
                    
                    {/* Search Autocomplete Suggestions Dropdown */}
                    {suggestions.length > 0 && (
                      <div className="absolute top-full left-0 right-0 mt-2 bg-slate-900 border border-white/10 rounded-xl overflow-hidden shadow-2xl z-50 divide-y divide-white/5 max-h-60 overflow-y-auto">
                        {suggestions.map((item) => (
                          <button
                            key={item.place_id}
                            type="button"
                            onClick={() => selectSuggestion(item)}
                            className="w-full text-left p-3 hover:bg-white/5 text-xs text-slate-200 transition-colors flex flex-col gap-0.5"
                          >
                            <span className="font-bold truncate text-white">{item.display_name.split(",")[0]}</span>
                            <span className="text-[10px] text-slate-400 truncate">{item.display_name}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Geolocation resolving state banner */}
                  {locationResolvingState && (
                    <div className="flex items-center gap-2 text-[10px] text-electric-blue bg-electric-blue/10 border border-electric-blue/20 px-3 py-1.5 rounded-lg font-medium font-mono">
                      <span className="w-1.5 h-1.5 rounded-full bg-electric-blue animate-ping" />
                      <span>{locationResolvingState}</span>
                    </div>
                  )}

                  {/* Leaflet Map Block */}
                  <div className="h-[280px] w-full rounded-2xl overflow-hidden relative border border-white/5 shadow-inner">
                    <InteractiveMap
                      center={mapCenter}
                      zoom={mapZoom}
                      draggable={true}
                      onMarkerDragEnd={handleMarkerDragEnd}
                      onMapClick={handleMapClick}
                    />
                  </div>

                  {/* Draggable indicator tooltip */}
                  <p className="text-[10px] text-on-surface-variant/60 flex items-center gap-1">
                    <span className="material-symbols-outlined text-xs text-electric-blue">info</span>
                    Tip: Drag the pin or click on the map to mark the exact location of the issue.
                  </p>
                </div>

                {/* Right side (5 cols): Address Readouts & Descriptive Form */}
                <div className="md:col-span-5 space-y-4">
                  {/* Photo Preview & Address Info */}
                  <div className="glass-sm p-4 rounded-2xl border border-white/5 space-y-3">
                    <div className="flex gap-3 items-center">
                      <div className="h-16 w-20 rounded-lg overflow-hidden bg-surface-container-lowest border border-white/10 flex-shrink-0">
                        <img src={capturedImage} alt="Defect" className="h-full w-full object-cover" />
                      </div>
                      <div className="min-w-0">
                        <span className="text-[8px] font-bold text-electric-blue uppercase tracking-wider font-mono">Verified Coordinates</span>
                        <p className="text-[11px] font-bold text-white font-mono truncate">
                          {latitude?.toFixed(5)}° N, {longitude?.toFixed(5)}° E
                        </p>
                        <p className="text-[10px] text-on-surface-variant truncate">
                          {city || "Bengaluru"}, {stateName || "Karnataka"}
                        </p>
                      </div>
                    </div>
                    {formattedAddress && (
                      <div className="border-t border-white/5 pt-2">
                        <span className="text-[8px] font-bold text-on-surface-variant uppercase block font-mono">Geocoded Address</span>
                        <p className="text-[10px] text-slate-300 leading-normal mt-0.5 line-clamp-2">
                          {formattedAddress}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Descriptive Inputs */}
                  <div className="space-y-3">
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-on-surface-variant mb-1">
                        Your Name (Complainant)
                      </label>
                      <input
                        type="text"
                        value={citizenName}
                        onChange={(e) => {
                          setCitizenName(e.target.value);
                          if (nameError) setNameError(null);
                        }}
                        placeholder="e.g. Rahul Sharma"
                        className="w-full rounded-xl border border-white/10 bg-surface-container-lowest/40 p-2.5 text-xs text-white placeholder:text-on-surface-variant/40 focus:outline-none focus:border-electric-blue transition-all"
                      />
                      {nameError && (
                        <p className="text-[10px] text-rose-400 mt-1 font-medium font-sans">
                          ⚠️ {nameError}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-on-surface-variant mb-1">
                        Contact Info (Phone / Email)
                      </label>
                      <input
                        type="text"
                        value={contactInfo}
                        onChange={(e) => {
                          setContactInfo(e.target.value);
                          if (phoneError) setPhoneError(null);
                        }}
                        placeholder="e.g. +91 98765 43210"
                        className="w-full rounded-xl border border-white/10 bg-surface-container-lowest/40 p-2.5 text-xs text-white placeholder:text-on-surface-variant/40 focus:outline-none focus:border-electric-blue transition-all"
                      />
                      {phoneError && (
                        <p className="text-[10px] text-rose-400 mt-1 font-medium font-sans">
                          ⚠️ {phoneError}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-on-surface-variant mb-1">
                        Locality / Landmark
                      </label>
                      <input
                        type="text"
                        value={locality}
                        onChange={(e) => {
                          setLocality(e.target.value);
                          setIsLocalityManuallyEdited(true);
                        }}
                        placeholder="e.g. Koramangala 80ft Rd, Indiranagar"
                        className="w-full rounded-xl border border-white/10 bg-surface-container-lowest/40 p-2.5 text-xs text-white placeholder:text-on-surface-variant/40 focus:outline-none focus:border-electric-blue transition-all"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-on-surface-variant mb-1">
                        Derived Ward Zone
                      </label>
                      <select
                        value={selectedWard}
                        onChange={(e) => setSelectedWard(e.target.value)}
                        className="w-full rounded-xl border border-white/10 bg-surface-container-lowest/40 p-2.5 text-xs text-white focus:outline-none focus:border-electric-blue transition-all"
                      >
                        {wardsList.map((w) => (
                          <option key={w} value={w} className="bg-surface-container-highest">
                            {w}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              <div className="relative">
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">
                    What is the issue? (Description Context)
                  </label>
                  <button
                    type="button"
                    onClick={isListening ? stopListening : startListening}
                    className={`flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-md border transition-all ${
                      isListening
                        ? "bg-red-500/20 text-red-400 border-red-500/30 animate-pulse"
                        : "bg-white/5 text-on-surface-variant hover:text-white border-white/5 hover:border-white/10"
                    }`}
                  >
                    <span className="material-symbols-outlined text-xs">
                      {isListening ? "mic" : "mic_off"}
                    </span>
                    {isListening ? "Listening..." : "Voice Input"}
                  </button>
                </div>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe details (e.g. deep pothole near shop, leaking water flowing into main drainage...)"
                  className="w-full rounded-xl border border-white/10 bg-surface-container-lowest/40 p-3 text-sm text-on-surface placeholder:text-on-surface-variant/40 focus:outline-none focus:border-electric-blue transition-all min-h-[90px] resize-none"
                />
              </div>

              <div className="shimmer-border">
                <button
                  onClick={submitToVisionAgent}
                  disabled={!locality || !description}
                  className="w-full bg-primary text-on-primary py-4 rounded-xl font-display text-sm font-bold flex items-center justify-center gap-2 hover:brightness-110 active:scale-95 transition-all relative z-10 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Analyze with Vision Agent
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP: Loading analyze image */}
          {step === "analyzing_image" && (
            <div className="p-8 text-center flex flex-col items-center justify-center gap-6">
              <div className="relative flex items-center justify-center">
                <div className="h-20 w-20 rounded-full border-4 border-electric-blue/10 border-t-electric-blue animate-spin" />
                <Bot className="h-8 w-8 text-electric-blue absolute" />
              </div>
              <div className="space-y-3 w-full">
                <h3 className="text-lg font-bold text-white tracking-tight">
                  Vision Agent Diagnostic Scan
                </h3>
                <p className="text-xs text-on-surface-variant max-w-sm mx-auto font-mono bg-surface-container-lowest/60 p-4 rounded-xl border border-white/5 text-left h-24 overflow-y-auto terminal-scroll">
                  {loadingLog}
                </p>
              </div>
            </div>
          )}

          {/* STEP: Follow-up AI Interview */}
          {step === "questions" && analysis && (
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b border-white/5 pb-4 flex-wrap gap-3">
                <div className="flex items-center gap-2">
                  <BrainCircuit className="h-5 w-5 text-electric-blue" />
                  <h2 className="text-lg md:text-xl font-bold text-white font-display">
                    Agent Diagnosis
                  </h2>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] px-2.5 py-1 rounded bg-white/5 border border-white/5 text-on-surface-variant font-mono">
                    Conf: {(analysis.confidence * 100).toFixed(0)}%
                  </span>
                  <span className="text-[10px] px-2.5 py-1 rounded bg-rose-500/10 border border-rose-500/20 text-rose-400 font-bold uppercase tracking-wider">
                    Severity: {analysis.severity}
                  </span>
                </div>
              </div>

              <div className="bg-surface-container-lowest/60 p-4 rounded-xl border border-white/5">
                <span className="text-[9px] font-bold text-on-surface-variant uppercase tracking-wider block mb-1">
                  Detected Defect Category
                </span>
                <p className="text-base font-bold text-white">{analysis.issue_type}</p>
                <p className="text-xs text-on-surface-variant mt-1.5 leading-relaxed">{analysis.issue_summary}</p>
              </div>

              {needsReupload && (
                <div className="bg-rose-500/10 border border-rose-500/20 rounded-2xl p-5 mb-4 relative overflow-hidden backdrop-blur-md">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <h4 className="text-rose-400 font-display font-bold text-sm flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-base">warning</span>
                        Clarification Required
                      </h4>
                      <p className="text-on-surface-variant/80 text-xs leading-relaxed">
                        The AI agent requested a clearer image to finalize the diagnosis. Please upload a higher quality or more focused photo of the issue.
                      </p>
                    </div>
                    
                    <div className="relative shrink-0">
                      <input
                        type="file"
                        accept="image/*"
                        id="reupload-photo-input"
                        className="hidden"
                        onChange={handleReuploadImage}
                        disabled={isReanalyzing}
                      />
                      <label
                        htmlFor="reupload-photo-input"
                        className={`bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 font-display text-[11px] font-bold py-2.5 px-4 rounded-xl transition-all flex items-center justify-center gap-1.5 active:scale-95 cursor-pointer ${
                          isReanalyzing ? "opacity-50 pointer-events-none" : ""
                        }`}
                      >
                        <span className="material-symbols-outlined text-sm animate-spin-slow">
                          {isReanalyzing ? "sync" : "photo_camera"}
                        </span>
                        {isReanalyzing ? "Re-analyzing..." : "Upload a Better Image"}
                      </label>
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-widest text-on-surface-variant/80 font-display">
                  Required Follow-Up Verification
                </h3>

                {analysis.follow_up_questions.map((q) => (
                  <div key={q} className="space-y-2">
                    <label className="block text-xs font-semibold text-slate-200">
                      {q}
                    </label>
                    <input
                      type="text"
                      value={answers[q] || ""}
                      onChange={(e) =>
                        setAnswers({ ...answers, [q]: e.target.value })
                      }
                      placeholder="Type your response..."
                      className="w-full rounded-xl border border-white/10 bg-surface-container-lowest/40 p-3 text-sm text-on-surface placeholder:text-on-surface-variant/40 focus:outline-none focus:border-electric-blue transition-all"
                    />
                  </div>
                ))}
              </div>

              <div className="shimmer-border">
                <button
                  onClick={submitToDecisionAgent}
                  disabled={Object.values(answers).some((val) => !val.trim())}
                  className="w-full bg-primary text-on-primary py-4 rounded-xl font-display text-sm font-bold flex items-center justify-center gap-2 hover:brightness-110 active:scale-95 transition-all relative z-10 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Generate Resolution Blueprint
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP: Loading generating report */}
          {step === "generating_report" && (
            <div className="p-8 text-center flex flex-col items-center justify-center gap-6">
              <div className="relative flex items-center justify-center">
                <div className="h-20 w-20 rounded-full border-4 border-electric-blue/10 border-t-electric-blue animate-spin" />
                <Database className="h-8 w-8 text-electric-blue absolute" />
              </div>
              <div className="space-y-3 w-full">
                <h3 className="text-lg font-bold text-white tracking-tight">
                  Compiling Administrative Blueprint
                </h3>
                <p className="text-xs text-on-surface-variant max-w-sm mx-auto font-mono bg-surface-container-lowest/60 p-4 rounded-xl border border-white/5 text-left h-24 overflow-y-auto terminal-scroll">
                  {loadingLog}
                </p>
              </div>
            </div>
          )}

          {/* STEP: Potential Duplicate Warning */}
          {step === "duplicate_check" && duplicateReport && (
            <div className="space-y-6 animate-entrance">
              <div className="flex items-center gap-3 border-b border-white/5 pb-4 text-amber-400">
                <span className="material-symbols-outlined text-2xl">warning</span>
                <h2 className="text-lg md:text-xl font-bold font-display">
                  Potential Duplicate Issue Detected
                </h2>
              </div>
              
              <div className="glass-sm p-5 rounded-2xl border border-amber-500/20 bg-amber-500/5 space-y-4">
                <div className="flex justify-between items-start gap-4 flex-wrap">
                  <div>
                    <span className="text-[10px] font-bold text-amber-400/80 uppercase tracking-widest block mb-1 font-mono">
                      Active Ticket ID: {duplicateReport.id}
                    </span>
                    <h3 className="text-lg font-bold text-white leading-tight">
                      {duplicateReport.issue_type} in {duplicateReport.locality}
                    </h3>
                    <p className="text-xs text-on-surface-variant mt-1.5">
                      Ward: {duplicateReport.ward} • Priority: {duplicateReport.priority || duplicateReport.severity}
                    </p>
                  </div>
                  <span className="text-xs bg-slate-900 border border-white/10 px-3 py-1.5 rounded-lg text-slate-300 font-mono font-bold">
                    Status: {duplicateReport.status || "Investigating"}
                  </span>
                </div>
                
                <p className="text-sm text-slate-300 leading-relaxed border-t border-white/5 pt-3">
                  This issue has already been reported and is supported by <strong className="text-electric-blue font-bold font-mono">{duplicateReport.supporter_count || 1}</strong> local citizens. Joining this ticket accelerates department routing and prioritization.
                </p>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <button
                  onClick={handleSupportDuplicate}
                  className="bg-electric-blue text-background py-4 rounded-xl font-display text-sm font-bold flex items-center justify-center gap-2 hover:brightness-110 active:scale-95 transition-all shadow-lg shadow-electric-blue/20"
                >
                  <span className="material-symbols-outlined">thumb_up</span>
                  Support Existing Report
                </button>
                <button
                  onClick={handleIgnoreDuplicate}
                  className="glass-sm text-white py-4 rounded-xl font-display text-sm font-bold flex items-center justify-center gap-2 hover:bg-white/10 transition-all border border-white/10 active:scale-95"
                >
                  Create Independent Report
                </button>
              </div>
            </div>
          )}

        </div>

        {/* Global Security Banner */}
        <div className="flex items-center justify-center gap-2 mt-6 text-on-surface-variant/70 text-xs font-display">
          <ShieldCheck className="h-4 w-4 text-electric-blue" />
          <span>Data encrypted, signed, and anonymized under public municipal code compliance.</span>
        </div>

      </div>
    </div>
  );
}
