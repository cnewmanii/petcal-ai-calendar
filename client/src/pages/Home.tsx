import { useState, useRef, useCallback } from "react";
import { useLocation } from "wouter";
import { Upload, Camera, Dog, Cat, Sparkles, Star, ChevronRight, ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

const MONTHS = [
  { month: "Jan", holiday: "New Year's", icon: "🎆" },
  { month: "Feb", holiday: "Valentine's", icon: "💝" },
  { month: "Mar", holiday: "St. Patrick's", icon: "🍀" },
  { month: "Apr", holiday: "Easter", icon: "🐣" },
  { month: "May", holiday: "Mother's Day", icon: "🌸" },
  { month: "Jun", holiday: "Summer", icon: "☀️" },
  { month: "Jul", holiday: "4th of July", icon: "🎇" },
  { month: "Aug", holiday: "Pet Day", icon: "🐾" },
  { month: "Sep", holiday: "Back to School", icon: "📚" },
  { month: "Oct", holiday: "Halloween", icon: "🎃" },
  { month: "Nov", holiday: "Thanksgiving", icon: "🦃" },
  { month: "Dec", holiday: "Christmas", icon: "🎄" },
];

export default function Home() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [petName, setPetName] = useState("");
  const [petType, setPetType] = useState<"dog" | "cat" | null>(null);
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback((file: File) => {
    if (!file.type.startsWith("image/")) {
      toast({ title: "Please upload an image file", variant: "destructive" });
      return;
    }
    setPhoto(file);
    const reader = new FileReader();
    reader.onload = (e) => setPhotoPreview(e.target?.result as string);
    reader.readAsDataURL(file);
  }, [toast]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const handleSubmit = async () => {
    if (!petName.trim()) {
      toast({ title: "Please enter your pet's name", variant: "destructive" });
      return;
    }
    if (!petType) {
      toast({ title: "Please select dog or cat", variant: "destructive" });
      return;
    }
    if (!photo) {
      toast({ title: "Please upload a photo of your pet", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("petName", petName);
      formData.append("petType", petType);
      formData.append("photo", photo);

      const res = await fetch("/api/calendars", { method: "POST", body: formData });
      if (!res.ok) throw new Error("Failed to create calendar");
      const data = await res.json();
      setLocation(`/calendar/${data.id}`);
    } catch (err) {
      toast({ title: "Something went wrong. Please try again.", variant: "destructive" });
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <div className="relative overflow-hidden bg-gradient-to-br from-primary/10 via-background to-accent/20">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/5 via-transparent to-transparent" />
        <div className="relative max-w-6xl mx-auto px-6 py-16 text-center">
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary rounded-full px-4 py-1.5 text-sm font-medium mb-6">
            <Sparkles className="w-4 h-4" />
            AI-Powered Custom Pet Calendars
          </div>
          <h1 className="text-5xl md:text-6xl font-bold tracking-tight text-foreground mb-4">
            Your Pet. Every Holiday.
            <span className="block text-primary mt-1">All Year Long.</span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto mb-8">
            Upload a photo of your dog or cat and our AI creates a gorgeous 12-month calendar with your pet celebrating every major holiday.
          </p>
          <div className="flex items-center justify-center gap-6 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5"><Star className="w-4 h-4 text-primary fill-primary" /> AI-generated art</span>
            <span className="flex items-center gap-1.5"><Star className="w-4 h-4 text-primary fill-primary" /> 12 unique images</span>
            <span className="flex items-center gap-1.5"><Star className="w-4 h-4 text-primary fill-primary" /> Print-ready quality</span>
          </div>
        </div>
      </div>

      {/* Month Preview Strip */}
      <div className="bg-card border-y border-border py-4 overflow-x-auto">
        <div className="flex gap-3 px-6 min-w-max mx-auto justify-center">
          {MONTHS.map((m) => (
            <div key={m.month} className="flex flex-col items-center gap-1 px-3 py-2 rounded-md bg-background border border-border min-w-[72px]">
              <span className="text-lg">{m.icon}</span>
              <span className="text-xs font-semibold text-foreground">{m.month}</span>
              <span className="text-[10px] text-muted-foreground text-center leading-tight">{m.holiday}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Main Form */}
      <div className="max-w-2xl mx-auto px-6 py-16">
        <div className="text-center mb-10">
          <h2 className="text-3xl font-bold text-foreground mb-2">Create Your Calendar</h2>
          <p className="text-muted-foreground">It takes less than a minute to get started</p>
        </div>

        <div className="space-y-6">
          {/* Pet Name */}
          <div className="space-y-2">
            <Label htmlFor="pet-name" className="text-sm font-medium">Your pet's name</Label>
            <Input
              id="pet-name"
              data-testid="input-pet-name"
              placeholder="e.g. Buddy, Luna, Max..."
              value={petName}
              onChange={(e) => setPetName(e.target.value)}
              className="h-11"
            />
          </div>

          {/* Pet Type */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Pet type</Label>
            <div className="grid grid-cols-2 gap-3">
              {[
                { type: "dog" as const, label: "Dog", Icon: Dog },
                { type: "cat" as const, label: "Cat", Icon: Cat },
              ].map(({ type, label, Icon }) => (
                <button
                  key={type}
                  data-testid={`button-pet-type-${type}`}
                  onClick={() => setPetType(type)}
                  className={`flex items-center justify-center gap-3 p-4 rounded-md border-2 transition-all cursor-pointer ${
                    petType === type
                      ? "border-primary bg-primary/5 text-primary"
                      : "border-border bg-background text-foreground"
                  }`}
                >
                  <Icon className="w-6 h-6" />
                  <span className="font-medium">{label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Photo Upload */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Upload a photo</Label>
            <div
              data-testid="drop-zone-photo"
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileRef.current?.click()}
              className={`relative cursor-pointer rounded-md border-2 border-dashed transition-all ${
                dragOver ? "border-primary bg-primary/5" : "border-border"
              } ${photoPreview ? "p-0 overflow-hidden" : "p-10"}`}
            >
              {photoPreview ? (
                <div className="relative">
                  <img
                    src={photoPreview}
                    alt="Pet preview"
                    className="w-full h-64 object-cover"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center">
                    <div className="text-white text-center">
                      <Camera className="w-8 h-8 mx-auto mb-2" />
                      <span className="text-sm font-medium">Change photo</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3 text-muted-foreground">
                  <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center">
                    <ImageIcon className="w-7 h-7" />
                  </div>
                  <div className="text-center">
                    <p className="font-medium text-foreground">Drop your photo here</p>
                    <p className="text-sm mt-1">or click to browse • JPG, PNG up to 10MB</p>
                  </div>
                  <Button variant="secondary" size="sm" type="button">
                    <Upload className="w-4 h-4 mr-2" />
                    Choose Photo
                  </Button>
                </div>
              )}
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                data-testid="input-file-photo"
                onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Tip: Use a clear, well-lit photo of your pet for best results. Front-facing photos work best.
            </p>
          </div>

          {/* Submit */}
          <Button
            data-testid="button-create-calendar"
            onClick={handleSubmit}
            disabled={loading}
            size="lg"
            className="w-full text-base"
          >
            {loading ? (
              <>
                <span className="animate-spin mr-2">⟳</span>
                Starting your calendar...
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5 mr-2" />
                Create My Calendar — $29.99
                <ChevronRight className="w-5 h-5 ml-1" />
              </>
            )}
          </Button>

          <p className="text-center text-xs text-muted-foreground">
            Preview is free. Payment only after you approve the generated images.
          </p>
        </div>
      </div>

      {/* How It Works */}
      <div className="bg-card border-t border-border py-16">
        <div className="max-w-4xl mx-auto px-6">
          <h3 className="text-2xl font-bold text-center text-foreground mb-10">How It Works</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { step: "1", title: "Upload Your Photo", desc: "Share a clear photo of your dog or cat. The better the photo, the better the results." },
              { step: "2", title: "AI Creates Your Calendar", desc: "Our AI generates 12 unique images — one for each month — featuring your pet and the holiday." },
              { step: "3", title: "Purchase & Download", desc: "Love what you see? Purchase your calendar for $29.99 and download print-ready files." },
            ].map((item) => (
              <div key={item.step} className="text-center">
                <div className="w-12 h-12 rounded-full bg-primary text-primary-foreground text-lg font-bold flex items-center justify-center mx-auto mb-4">
                  {item.step}
                </div>
                <h4 className="font-semibold text-foreground mb-2">{item.title}</h4>
                <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
