"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTheme } from "next-themes";
import {
  Home,
  LayoutGrid,
  Layers,
  ClipboardCheck,
  Info,
  Search,
  Settings,
  ChevronRight,
  Star,
  RotateCcw,
  X,
  FlaskConical,
  Stethoscope,
  type LucideIcon,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import { loadAppData, normFa, assetUrl, type AppData, type TestRecord } from "@/lib/types";
import { useRoute, type Route } from "@/lib/nav";
import { useAppStore } from "@/lib/store";
import { HomeView } from "@/components/views/home";
import { CategoriesView, CategoryView } from "@/components/views/categories";
import { TestView } from "@/components/views/test";
import { LeitnerView } from "@/components/views/leitner";
import { QuizView } from "@/components/views/quiz";
import { AboutView } from "@/components/views/about";
import { InterpretView } from "@/components/views/interpret";
import { ViewErrorBoundary } from "@/components/error-boundary";
import { initWidgetSync, pullWidgetState, isNativeApp } from "@/lib/widget-bridge";
import { App } from "@capacitor/app";
import { cn, faNum } from "@/lib/utils";

// ---------------- Splash ----------------
function Splash() {
  return (
    <div className="fixed inset-0 grid place-items-center bg-background">
      <div className="flex flex-col items-center gap-5">
        <div className="relative">
          <div className="absolute inset-0 rounded-3xl bg-primary/25 blur-2xl" />
          <img src={assetUrl("/icons/icon-192.png")} alt="آزمـیار" className="relative h-24 w-24 rounded-3xl shadow-xl" />
        </div>
        <div className="text-center">
          <div className="text-2xl font-black tracking-tight">آزمـیار</div>
          <div className="mt-1 text-sm text-muted-foreground">مرجع آموزشی آزمایش‌های آزمایشگاهی</div>
        </div>
        <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-primary/25 border-t-primary" />
      </div>
    </div>
  );
}

// ---------------- Bottom nav ----------------
const TABS: { key: string; title: string; icon: LucideIcon; route: Route }[] = [
  { key: "home", title: "خانه", icon: Home, route: { v: "home" } },
  { key: "cats", title: "دسته‌بندی", icon: LayoutGrid, route: { v: "cats" } },
  { key: "leitner", title: "لایتنر", icon: Layers, route: { v: "leitner" } },
  { key: "quiz", title: "آزمون", icon: ClipboardCheck, route: { v: "quiz" } },
  { key: "interpret", title: "تفسیر", icon: Stethoscope, route: { v: "interpret" } },
  { key: "about", title: "درباره", icon: Info, route: { v: "about" } },
];

function BottomNav({ route, navigate, dueBadge }: { route: Route; navigate: (r: Route) => void; dueBadge: number }) {
  const active = route.v;
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t bg-card/85 backdrop-blur-lg pb-safe"
      aria-label="ناوبری اصلی"
    >
      <div className="mx-auto flex max-w-xl items-stretch justify-around px-2">
        {TABS.map((t) => {
          const isActive =
            active === t.key ||
            (t.key === "cats" && (route.v === "cat" || route.v === "test"));
          return (
            <button
              key={t.key}
              onClick={() => navigate(t.route)}
              aria-label={t.title}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "relative flex min-h-[56px] flex-1 flex-col items-center justify-center gap-1 py-1.5 text-[11px] font-semibold transition-colors",
                isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <span className="relative">
                <t.icon className={cn("h-[21px] w-[21px]", isActive && "drop-shadow-sm")} strokeWidth={isActive ? 2.4 : 1.8} />
                {t.key === "leitner" && dueBadge > 0 && (
                  <span className="absolute -right-2 -top-1.5 grid h-4.5 min-w-4.5 place-items-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">
                    {dueBadge > 99 ? "99+" : faNum(dueBadge)}
                  </span>
                )}
              </span>
              {t.title}
              {isActive && <span className="absolute top-0 h-[3px] w-8 rounded-b-full bg-primary" />}
            </button>
          );
        })}
      </div>
    </nav>
  );
}

// ---------------- Search dialog ----------------
function SearchDialog({ open, onOpenChange, data, navigate }: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  data: AppData;
  navigate: (r: Route) => void;
}) {
  const [q, setQ] = useState("");
  const results = useMemo(() => {
    const nq = normFa(q);
    if (nq.length < 2) return [];
    return data.tests
      .filter((t) => {
        const hay = normFa(`${t.name} ${t.short} ${t.cat}`);
        return hay.includes(nq);
      })
      .slice(0, 40);
  }, [q, data.tests]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="top-[8%] translate-y-0 rounded-2xl max-w-xl">
        <DialogHeader className="sr-only">
          <DialogTitle>جستجو</DialogTitle>
        </DialogHeader>
        <div className="flex items-center gap-2 border-b pb-3">
          <Search className="h-5 w-5 text-muted-foreground" />
          <Input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="نام تست، مخفف یا دسته را جستجو کنید…"
            className="h-11 border-0 bg-muted/60 rounded-xl text-base focus-visible:ring-0"
          />
        </div>
        <div className="max-h-[55vh] space-y-1 overflow-y-auto thin-scroll -mx-1 px-1">
          {q.length >= 2 && results.length === 0 && (
            <p className="py-8 text-center text-sm text-muted-foreground">نتیجه‌ای یافت نشد</p>
          )}
          {results.map((t: TestRecord) => (
            <button
              key={t.id}
              onClick={() => {
                onOpenChange(false);
                navigate({ v: "test", id: t.id });
              }}
              className="flex w-full items-center gap-3 rounded-xl p-3 text-right transition-colors hover:bg-muted"
            >
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                <FlaskConical className="h-4.5 w-4.5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-semibold">{t.name}</span>
                <span className="block truncate text-xs text-muted-foreground">
                  {t.cat}
                  {t.short ? ` • ${t.short}` : ""}
                </span>
              </span>
              <ChevronRight className="h-4 w-4 rotate-180 text-muted-foreground" />
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ---------------- Settings sheet ----------------
function SettingsSheet({ data }: { data: AppData }) {
  const { theme, setTheme } = useTheme();
  const { settings, setSettings, resetLeitner, resetAll, favorites, read } = useAppStore();
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const id = window.setTimeout(() => setMounted(true), 0);
    return () => window.clearTimeout(id);
  }, []);
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="تنظیمات" className="rounded-xl">
          <Settings className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-[320px] rounded-l-3xl p-5 overflow-y-auto thin-scroll">
        <SheetHeader className="p-0">
          <SheetTitle className="flex items-center gap-2 text-lg">
            <Settings className="h-5 w-5 text-primary" /> تنظیمات
          </SheetTitle>
        </SheetHeader>
        <div className="mt-6 space-y-6">
          <div>
            <p className="mb-2.5 text-sm font-bold">حالت نمایش</p>
            <div className="grid grid-cols-3 gap-2">
              {(["light", "dark", "system"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTheme(t)}
                  className={cn(
                    "rounded-xl border p-2.5 text-xs font-semibold transition-colors",
                    mounted && theme === t ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground"
                  )}
                >
                  {t === "light" ? "روشن" : t === "dark" ? "تیره" : "سیستم"}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="mb-2.5 text-sm font-bold">اندازه متن مطالعه</p>
            <div className="grid grid-cols-4 gap-2">
              {(["sm", "md", "lg", "xl"] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setSettings({ fontSize: f })}
                  className={cn(
                    "rounded-xl border py-2 font-semibold transition-colors",
                    f === "sm" && "text-xs", f === "md" && "text-sm", f === "lg" && "text-base", f === "xl" && "text-lg",
                    settings.fontSize === f ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground"
                  )}
                >
                  {f === "sm" ? "کوچک" : f === "md" ? "معمولی" : f === "lg" ? "بزرگ" : "بزرگ‌تر"}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="mb-2.5 flex items-center justify-between text-sm font-bold">
              <span>کارت‌های مرور در هر جلسه</span>
              <span className="text-primary">{faNum(settings.dailyCards)}</span>
            </p>
            <Slider
              value={[settings.dailyCards]}
              min={5}
              max={30}
              step={5}
              onValueChange={(v) => setSettings({ dailyCards: v[0] })}
              className="py-2"
            />
          </div>
          <Separator />
          <div className="space-y-1 text-xs text-muted-foreground">
            <p>مطالب خوانده‌شده: {faNum(read.length)}</p>
            <p>علاقه‌مندی‌ها: {faNum(favorites.length)}</p>
          </div>
          <Button
            variant="outline"
            className="w-full rounded-xl"
            onClick={() => {
              resetLeitner();
              toast.success("پیشرفت جعبه لایتنر صفر شد");
            }}
          >
            <RotateCcw className="h-4 w-4" /> بازنشانی جعبه لایتنر
          </Button>
          <Button
            variant="destructive"
            className="w-full rounded-xl"
            onClick={() => {
              resetAll();
              toast.success("همه داده‌های کاربر پاک شد");
            }}
          >
            <X className="h-4 w-4" /> پاک کردن همه داده‌های من
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ---------------- Shell ----------------
export function AppShell() {
  const [data, setData] = useState<AppData | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [route, navigate] = useRoute();
  const leitner = useAppStore((s) => s.leitner);
  // Android hardware back: go one step back; when nothing left, ask before exiting
  const [exitOpen, setExitOpen] = useState(false);
  const exitOpenRef = useRef(false);
  useEffect(() => {
    exitOpenRef.current = exitOpen;
  }, [exitOpen]);

  useEffect(() => {
    loadAppData()
      .then(setData)
      .catch(() => setData(null));
    if ("serviceWorker" in navigator && !location.hostname.startsWith("localhost") && !location.hostname.startsWith("127.")) {
      navigator.serviceWorker.register(assetUrl("/sw.js")).catch(() => {});
    }
    // Android home-screen widget sync (no-op on web)
    const stopWidgetSync = initWidgetSync();
    // Android hardware back button: history back, or exit confirmation at the root
    let backSub: { remove: () => void } | null = null;
    if (isNativeApp()) {
      void App.addListener("backButton", ({ canGoBack }) => {
        if (exitOpenRef.current) {
          setExitOpen(false); // second back press = cancel dialog
          return;
        }
        if (canGoBack) window.history.back();
        else setExitOpen(true);
      }).then((s) => {
        backSub = s;
      });
    }
    return () => {
      stopWidgetSync();
      backSub?.remove();
    };
  }, []);

  // keep the app in sync with home-screen widget edits on every navigation
  useEffect(() => {
    if (isNativeApp()) void pullWidgetState();
  }, [route]);

  const dueBadge = useMemo(() => {
    if (!data) return 0;
    const now = Date.now();
    return data.cards.filter((c) => {
      const st = leitner[c.id];
      return !st || st.due <= now;
    }).length;
  }, [data, leitner]);

  if (!data) return <Splash />;

  const title =
    route.v === "cat" ? route.cat : route.v === "test" ? "" : TABS.find((t) => t.key === route.v)?.title ?? "";

  return (
    <div className="mx-auto flex min-h-screen max-w-2xl flex-col border-x border-border/40 bg-background">
      {/* Top bar */}
      <header className="sticky top-0 z-30 border-b bg-card/85 backdrop-blur-lg">
        <div className="flex items-center gap-1.5 px-3 py-2">
          {route.v === "test" || route.v === "cat" ? (
            <Button variant="ghost" size="icon" onClick={() => navigate(route.v === "test" ? { v: "cat", cat: (data.tests.find((t) => t.id === route.id)?.cat) ?? "" } : { v: "cats" })} aria-label="بازگشت" className="rounded-xl">
              <ChevronRight className="h-5 w-5" />
            </Button>
          ) : (
            <button
              onClick={() => navigate({ v: "home" })}
              className="flex items-center gap-2 rounded-xl px-1.5 py-1"
              aria-label="خانه"
            >
              <img src={assetUrl("/icons/icon-64.png")} alt="" className="h-9 w-9 rounded-xl" />
              <span className="text-lg font-black text-primary">آزمـیار</span>
            </button>
          )}
          {route.v === "cat" || route.v === "test" ? (
            <h1 className="min-w-0 flex-1 truncate text-[15px] font-bold">{title}</h1>
          ) : (
            <h1 className="flex-1" />
          )}
          <Button variant="ghost" size="icon" onClick={() => setSearchOpen(true)} aria-label="جستجو" className="rounded-xl">
            <Search className="h-5 w-5" />
          </Button>
          <SettingsSheet data={data} />
        </div>
      </header>

      <main className="flex-1 px-3 pb-28 pt-4">
        <ViewErrorBoundary>
          {route.v === "home" && <HomeView data={data} navigate={navigate} />}
          {route.v === "cats" && <CategoriesView data={data} navigate={navigate} />}
          {route.v === "cat" && <CategoryView data={data} cat={route.cat} navigate={navigate} />}
          {route.v === "test" && <TestView data={data} id={route.id} navigate={navigate} />}
          {route.v === "leitner" && <LeitnerView data={data} navigate={navigate} />}
          {route.v === "quiz" && <QuizView data={data} navigate={navigate} />}
          {route.v === "interpret" && <InterpretView data={data} />}
          {route.v === "about" && <AboutView data={data} />}
        </ViewErrorBoundary>
      </main>

      <BottomNav route={route} navigate={navigate} dueBadge={dueBadge} />
      <SearchDialog open={searchOpen} onOpenChange={setSearchOpen} data={data} navigate={navigate} />
      <AlertDialog open={exitOpen} onOpenChange={setExitOpen}>
        <AlertDialogContent className="max-w-xs rounded-2xl">
          <AlertDialogHeader className="items-center text-center">
            <AlertDialogTitle className="text-base">خروج از آزمـیار</AlertDialogTitle>
            <AlertDialogDescription className="text-center text-[13px] leading-6">
              آیا مطمئنید می‌خواهید از برنامه خارج شوید؟
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-row-reverse gap-2 sm:justify-center">
            <AlertDialogCancel className="mt-0 rounded-xl">ماندن</AlertDialogCancel>
            <AlertDialogAction
              className="rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => void App.exitApp()}
            >
              خروج
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <Toaster position="top-center" richColors />
    </div>
  );
}
