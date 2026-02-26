import { useEffect, useState } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft,
  ShoppingCart,
  Sparkles,
  CheckCircle,
  Loader2,
  Calendar,
  Lock,
  Download,
} from "lucide-react";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

type CalendarData = {
  id: number;
  petName: string;
  petType: string;
  status: "pending" | "generating" | "ready" | "purchased";
  generatedCount: number;
  totalMonths: number;
  months: Array<{
    id: number;
    month: number;
    holidayName: string;
    imageUrl: string | null;
    generated: number;
  }>;
};

function MonthCard({ month, petName, isUnlocked }: {
  month: CalendarData["months"][0];
  petName: string;
  isUnlocked: boolean;
}) {
  const monthName = MONTH_NAMES[month.month - 1];

  return (
    <div
      data-testid={`card-month-${month.month}`}
      className="group rounded-md overflow-hidden border border-border bg-card hover-elevate"
    >
      <div className="relative aspect-square bg-muted overflow-hidden">
        {month.generated === 1 && month.imageUrl ? (
          <>
            <img
              src={month.imageUrl}
              alt={`${petName} in ${monthName}`}
              className={`w-full h-full object-cover transition-transform duration-300 group-hover:scale-105 ${!isUnlocked ? "filter blur-sm scale-105" : ""}`}
            />
            {!isUnlocked && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                <div className="bg-black/50 rounded-md px-3 py-2 flex items-center gap-2 text-white text-sm">
                  <Lock className="w-4 h-4" />
                  <span className="font-medium">Purchase to unlock</span>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center gap-3 text-muted-foreground p-4">
            {month.generated === 0 ? (
              <>
                <div className="w-10 h-10 rounded-full bg-muted-foreground/10 flex items-center justify-center">
                  <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                </div>
                <p className="text-xs text-center text-muted-foreground">Generating...</p>
              </>
            ) : (
              <Skeleton className="w-full h-full absolute inset-0" />
            )}
          </div>
        )}
      </div>
      <div className="p-3">
        <div className="flex items-center justify-between gap-2">
          <div>
            <p className="font-semibold text-sm text-foreground">{monthName}</p>
            <p className="text-xs text-muted-foreground">{month.holidayName}</p>
          </div>
          {month.generated === 1 && (
            <Badge variant="secondary" className="text-[10px]">
              <CheckCircle className="w-3 h-3 mr-1" />
              Ready
            </Badge>
          )}
        </div>
      </div>
    </div>
  );
}

export default function CalendarPage() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [email, setEmail] = useState("");

  const { data: calendar, isLoading } = useQuery<CalendarData>({
    queryKey: ["/api/calendars", id],
    queryFn: () => fetch(`/api/calendars/${id}`).then((r) => r.json()),
    refetchInterval: (data) => {
      if (!data) return 3000;
      if (data.status === "generating") return 3000;
      if (data.status === "pending") return 2000;
      return false;
    },
  });

  const isGenerating = calendar?.status === "generating" || calendar?.status === "pending";
  const isReady = calendar?.status === "ready";
  const isPurchased = calendar?.status === "purchased";
  const progress = calendar ? (calendar.generatedCount / 12) * 100 : 0;

  const { data: stripeStatus } = useQuery<{ enabled: boolean }>({
    queryKey: ["/api/stripe/status"],
  });
  const paymentsAvailable = stripeStatus?.enabled ?? false;

  const handleCheckout = async () => {
    if (!paymentsAvailable) {
      toast({ title: "Payments are coming soon! Check back later.", variant: "destructive" });
      return;
    }
    setCheckoutLoading(true);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ calendarId: id, email }),
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || "Checkout failed");
      }
      const data = await res.json();
      if (data.url) window.location.href = data.url;
    } catch (err: any) {
      toast({ title: err.message || "Checkout failed. Please try again.", variant: "destructive" });
      setCheckoutLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-muted-foreground">
          <Loader2 className="w-8 h-8 animate-spin" />
          <p className="text-sm">Loading your calendar...</p>
        </div>
      </div>
    );
  }

  if (!calendar) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground">Calendar not found</p>
          <Button variant="ghost" className="mt-4" onClick={() => setLocation("/")}>
            <ArrowLeft className="w-4 h-4 mr-2" /> Go Home
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between gap-4">
          <button
            onClick={() => setLocation("/")}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            data-testid="button-back-home"
          >
            <ArrowLeft className="w-4 h-4" />
            Start Over
          </button>
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-primary" />
            <span className="font-semibold text-foreground">{calendar.petName}'s Calendar</span>
            <Badge variant={isPurchased ? "default" : isReady ? "secondary" : "outline"}>
              {isPurchased ? "Purchased" : isReady ? "Ready" : "Generating..."}
            </Badge>
          </div>
          <div className="w-24" />
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Progress Bar */}
        {isGenerating && (
          <div className="mb-8 p-6 bg-primary/5 border border-primary/20 rounded-md">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-primary animate-pulse" />
              </div>
              <div>
                <p className="font-semibold text-foreground">AI is creating your calendar</p>
                <p className="text-sm text-muted-foreground">
                  {calendar.generatedCount} of 12 images generated
                  {calendar.generatedCount < 12 ? " — this may take a few minutes" : ""}
                </p>
              </div>
            </div>
            <Progress value={progress} className="h-2" data-testid="progress-generation" />
          </div>
        )}

        {/* Purchased Banner */}
        {isPurchased && (
          <div className="mb-8 p-6 bg-green-500/10 border border-green-500/20 rounded-md flex items-center gap-3">
            <CheckCircle className="w-8 h-8 text-green-500 shrink-0" />
            <div>
              <p className="font-semibold text-foreground">Your calendar is unlocked!</p>
              <p className="text-sm text-muted-foreground">
                Thank you for your purchase. All 12 high-resolution images are ready to view and download below.
              </p>
            </div>
          </div>
        )}

        {/* Calendar Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 mb-10">
          {MONTH_NAMES.map((_, i) => {
            const monthData = calendar.months?.find((m) => m.month === i + 1);
            if (!monthData) {
              return (
                <div key={i} className="rounded-md border border-border bg-card overflow-hidden">
                  <div className="aspect-square bg-muted flex items-center justify-center">
                    <Loader2 className="w-6 h-6 text-muted-foreground animate-spin" />
                  </div>
                  <div className="p-3">
                    <p className="font-semibold text-sm text-foreground">{MONTH_NAMES[i]}</p>
                    <p className="text-xs text-muted-foreground">Queued...</p>
                  </div>
                </div>
              );
            }
            return (
              <MonthCard
                key={monthData.id}
                month={monthData}
                petName={calendar.petName}
                isUnlocked={isPurchased}
              />
            );
          })}
        </div>

        {/* Purchase CTA */}
        {!isPurchased && isReady && (
          <div className="max-w-md mx-auto">
            <Card className="p-6 text-center space-y-4">
              <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                <ShoppingCart className="w-7 h-7 text-primary" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-foreground">Love your calendar?</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Purchase to unlock all 12 high-resolution images ready for printing.
                </p>
              </div>
              <div className="text-3xl font-bold text-foreground">$29.99</div>
              <div className="space-y-3">
                <input
                  type="email"
                  placeholder="Your email (for receipt)"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  data-testid="input-email"
                />
                <Button
                  className="w-full"
                  size="lg"
                  onClick={handleCheckout}
                  disabled={checkoutLoading}
                  data-testid="button-purchase"
                >
                  {checkoutLoading ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Redirecting to payment...</>
                  ) : (
                    <><ShoppingCart className="w-4 h-4 mr-2" /> Purchase Calendar — $29.99</>
                  )}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Secure checkout powered by Stripe. Instant download after payment.
              </p>
              <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><CheckCircle className="w-3 h-3 text-green-500" /> 12 high-res images</span>
                <span className="flex items-center gap-1"><CheckCircle className="w-3 h-3 text-green-500" /> Print-ready files</span>
                <span className="flex items-center gap-1"><CheckCircle className="w-3 h-3 text-green-500" /> Instant access</span>
              </div>
            </Card>
          </div>
        )}

        {/* Still generating CTA */}
        {isGenerating && (
          <div className="text-center mt-4">
            <p className="text-sm text-muted-foreground">
              Hang tight! We're using AI to create each unique image. The page updates automatically.
            </p>
          </div>
        )}

        {/* Purchased Download Section */}
        {isPurchased && (
          <div className="max-w-md mx-auto mt-4">
            <Card className="p-6 text-center space-y-4">
              <div className="w-14 h-14 rounded-full bg-green-500/10 flex items-center justify-center mx-auto">
                <Download className="w-7 h-7 text-green-500" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-foreground">All images unlocked!</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Right-click any image above to save it. Each image is 1024×1024px, ready for printing.
                </p>
              </div>
              <Button variant="outline" className="w-full" onClick={() => setLocation("/")} data-testid="button-create-another">
                <Sparkles className="w-4 h-4 mr-2" />
                Create Another Calendar
              </Button>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
