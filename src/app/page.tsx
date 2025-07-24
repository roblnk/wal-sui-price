
"use client";

import { useState, useEffect, useCallback } from 'react';
import { TrendingUp, Sun, Moon, Mail } from 'lucide-react';
import PriceCard from '@/components/price-card';
import RatioCard from '@/components/ratio-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { updateUserPreferences, getUserPreferences } from '@/ai/flows/background-flow';


export type PriceData = {
  price: number;
  direction: 'up' | 'down' | 'none';
};

export default function Home() {
  const [walPrice, setWalPrice] = useState<PriceData>({ price: 0, direction: 'none' });
  const [suiPrice, setSuiPrice] = useState<PriceData>({ price: 0, direction: 'none' });
  const [ratio, setRatio] = useState<number>(0);
  const [lastRatio, setLastRatio] = useState<number | null>(0);
  const [theme, setTheme] = useState('light');
  const [minRange, setMinRange] = useState("0.000000");
  const [maxRange, setMaxRange] = useState("0.000000");
  const [activeMinRange, setActiveMinRange] = useState("0.000000");
  const [activeMaxRange, setActiveMaxRange] = useState("0.000000");
  const [email, setEmail] = useState("");
  const [notificationEmail, setNotificationEmail] = useState("");
  const [showEraseAlert, setShowEraseAlert] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const { toast } = useToast();

  const fetchPrices = useCallback(async () => {
    try {
      const response = await fetch('/api/prices');
      if (!response.ok) {
        throw new Error('Failed to fetch prices');
      }
      const data = await response.json();
      
      setWalPrice(prev => ({
        price: data.walPrice,
        direction: data.walPrice > prev.price ? 'up' : 'down'
      }));

      setSuiPrice(prev => ({
        price: data.suiPrice,
        direction: data.suiPrice > prev.price ? 'up' : 'down'
      }));

    } catch (error) {
      console.error("Failed to fetch prices:", error);
    }
  }, []);

  useEffect(() => {
    fetchPrices();
    const interval = setInterval(fetchPrices, 5000);

    return () => {
      clearInterval(interval);
    };
  }, [fetchPrices]);


  useEffect(() => {
    // This effect runs once on component mount on the client side.
    const storedTheme = localStorage.getItem('theme') || 'dark';
    setTheme(storedTheme);
    document.documentElement.classList.toggle('dark', storedTheme === 'dark');

    const localEmail = localStorage.getItem('email') || "";
    setEmail(localEmail);

    async function loadUserPreferences() {
        try {
            const prefs = await getUserPreferences();
            if (prefs) {
                setNotificationEmail(prefs.email);
                setMinRange(prefs.minRange);
                setMaxRange(prefs.maxRange);
                setActiveMinRange(prefs.minRange);
                setActiveMaxRange(prefs.maxRange);
                setNotificationsEnabled(prefs.notificationsEnabled);
                if (localEmail && prefs.email !== localEmail) {
                    // This can happen if settings were configured on another browser
                    // We can decide which one to trust, for now, server wins
                    setEmail(prefs.email);
                    localStorage.setItem('email', prefs.email);
                }
            }
        } catch (e) {
            console.error("Could not load user preferences", e);
            toast({
                title: "Error",
                description: "Could not load saved notification settings.",
                variant: "destructive"
            });
        }
    }
    loadUserPreferences();

  }, [toast]);

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    document.documentElement.classList.toggle('dark', newTheme === 'dark');
  };

  const handleUpdateEmail = async () => {
    if(!email) {
        toast({
            title: "Error",
            description: "Please enter an email address.",
            variant: "destructive"
        });
        return;
    }
    try {
        await updateUserPreferences({ email });
        setNotificationEmail(email);
        toast({
            title: "Success",
            description: `Notification email updated to ${email}.`,
        });
    } catch (e) {
        toast({
            title: "Error",
            description: "Failed to update notification email.",
            variant: "destructive"
        });
    }
  };

  const handleUpdateRange = async () => {
    const min = parseFloat(minRange);
    const max = parseFloat(maxRange);

    if (min >= max) {
        toast({
            title: "Error",
            description: "The max range must be greater than the min range.",
            variant: "destructive"
        });
        return;
    }

    try {
        await updateUserPreferences({ minRange, maxRange });
        setActiveMinRange(minRange);
        setActiveMaxRange(maxRange);
        toast({
            title: "Success",
            description: `Notification range updated.`,
        });
    } catch (e) {
        toast({
            title: "Error",
            description: "Failed to update notification range.",
            variant: "destructive"
        });
    }
  };

  const handleEraseRange = async () => {
    const newMinRange = "0.000000";
    const newMaxRange = "0.000000";
    try {
        await updateUserPreferences({ minRange: newMinRange, maxRange: newMaxRange });
        setMinRange(newMinRange);
        setMaxRange(newMaxRange);
        setActiveMinRange(newMinRange);
        setActiveMaxRange(newMaxRange);
        setShowEraseAlert(false);
        toast({
            title: "Success",
            description: "Notification range has been erased.",
        });
    } catch(e) {
        setShowEraseAlert(false);
        toast({
            title: "Error",
            description: "Failed to erase notification range.",
            variant: "destructive"
        });
    }
  };

  const handleToggleNotifications = async () => {
    const newIsEnabled = !notificationsEnabled;
    try {
        await updateUserPreferences({ notificationsEnabled: newIsEnabled });
        setNotificationsEnabled(newIsEnabled);
        toast({
            title: "Success",
            description: `Notifications ${newIsEnabled ? 'enabled' : 'disabled'}.`,
        });
    } catch (e) {
        toast({
            title: "Error",
            description: "Failed to update notification settings.",
            variant: "destructive"
        });
    }
  };

  useEffect(() => {
    if (walPrice.price > 0 && suiPrice.price > 0) {
      const newRatio = walPrice.price / suiPrice.price;
      setLastRatio(ratio);
      setRatio(newRatio);
    }
  }, [walPrice, suiPrice, ratio]);


  const ratioDirection = lastRatio ? (ratio > lastRatio ? 'up' : 'down') : 'none';


  return (
    <div className="flex min-h-screen w-full flex-col">
      <header className="sticky top-0 z-10 flex h-auto flex-wrap items-center gap-4 border-b bg-background/80 px-4 py-4 backdrop-blur-sm md:h-16 md:flex-nowrap md:px-6">
        <div className="flex w-full items-center justify-between md:w-auto">
            <div className="flex items-center gap-2">
                <TrendingUp className="h-6 w-6 text-primary" />
                <h1 className="text-2xl font-bold tracking-tight">Turbo Tracker</h1>
            </div>
            <div className="md:hidden">
                <Button variant="ghost" size="icon" onClick={toggleTheme}>
                    <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                    <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                    <span className="sr-only">Toggle theme</span>
                </Button>
            </div>
        </div>
        <div className="flex w-full flex-grow items-center gap-2 md:w-auto md:flex-grow-0 md:ml-4">
            <div className="relative w-full md:w-48">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                    id="email-header" 
                    type="email" 
                    placeholder="Enter your email here!" 
                    className="pl-9 h-8"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      localStorage.setItem('email', e.target.value);
                    }}
                />
            </div>
            <Button size="sm" className="h-8" onClick={handleUpdateEmail}>Update</Button>
        </div>
        <div className="ml-auto hidden md:block">
            <Button variant="ghost" size="icon" onClick={toggleTheme}>
                <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                <span className="sr-only">Toggle theme</span>
            </Button>
        </div>
      </header>
      <main className="flex-1 p-4 md:p-8 lg:p-10">
        <div className="mx-auto max-w-7xl">
          <section className="mb-8">
            <h2 className="text-xl font-semibold text-foreground/80 mb-4">Live Prices</h2>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <RatioCard
                  ratio={ratio}
                  direction={ratioDirection}
                  minRange={minRange}
                  setMinRange={(value) => setMinRange(value)}
                  maxRange={maxRange}
                  setMaxRange={(value) => setMaxRange(value)}
                  activeMinRange={activeMinRange}
                  activeMaxRange={activeMaxRange}
                  onUpdate={handleUpdateRange}
                  onErase={() => setShowEraseAlert(true)}
                  notificationsEnabled={notificationsEnabled}
                  onToggleNotifications={handleToggleNotifications}
                />
              </div>
              <div className="flex flex-col gap-6">
                <PriceCard 
                  tokenName="Walrus"
                  tokenSymbol="WAL"
                  price={walPrice.price}
                  direction={walPrice.direction}
                />
                <PriceCard 
                  tokenName="Sui"
                  tokenSymbol="SUI"
                  price={suiPrice.price}
                  direction={suiPrice.direction}
                />
              </div>
            </div>
          </section>
        </div>
      </main>
      <footer className="border-t py-4 px-4 md:px-6">
        <p className="text-center text-sm text-muted-foreground">
          Prices are fetched from live data sources.
        </p>
      </footer>
      <AlertDialog open={showEraseAlert} onOpenChange={setShowEraseAlert}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action will permanently delete the current notification range. You cannot undo this action.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleEraseRange}>Continue</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );

    