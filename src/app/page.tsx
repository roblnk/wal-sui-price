
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label";
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
  const [showEraseAlert, setShowEraseAlert] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [showEmailDialog, setShowEmailDialog] = useState(false);
  const [lastNotifiedStateFrontend, setLastNotifiedStateFrontend] = useState<string | null>(null); // To track state for frontend notifications

  const { toast } = useToast();

  const fetchPrices = useCallback(async () => {
    try {
      const response = await fetch('/api/prices');
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch prices');
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
       toast({
          title: "Error",
          description: error instanceof Error ? error.message : "An unknown error occurred while fetching prices.",
          variant: "destructive",
        });
    }
  }, [toast]);



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
                setMinRange(prefs.minRange);
                setMaxRange(prefs.maxRange);
                setActiveMinRange(prefs.minRange);
                setActiveMaxRange(prefs.maxRange);
                setNotificationsEnabled(prefs.notificationsEnabled);
                
                const currentEmail = prefs.email || localEmail;
                setEmail(currentEmail);
                if (currentEmail) {
                    localStorage.setItem('email', currentEmail);
                }
            }
        } catch (e) {
            toast({
                title: "Error",
                description: "Could not load saved notification settings.",
                variant: "destructive"
            });
        }
    }
    loadUserPreferences();

    
    fetchPrices();
    const interval = setInterval(fetchPrices, 1000);

    return () => {
      clearInterval(interval);
    };

  }, [fetchPrices, toast]);



  // Effect for polling backend for notification state changes
  useEffect(() => {
    let notificationPollingInterval: NodeJS.Timeout | null = null;

    const pollNotificationState = async () => {
        try {
            const prefs = await getUserPreferences();
            if (prefs.notificationsEnabled) {
                // If the backend's last notified state is different from the frontend's tracked state,
                // and there's a valid new state from the backend, show a toast.
                if (prefs.lastNotifiedState && prefs.lastNotifiedState !== lastNotifiedStateFrontend) {
                    const message = prefs.lastNotifiedState === 'in-range' 
                        ? "The WAL/SUI ratio has moved back into your defined range."
                        : "The WAL/SUI ratio has moved out of your defined range.";
                    
                    toast({
                        title: `Ratio: ${prefs.lastNotifiedState.toUpperCase()}`,
                        description: message,
                        variant: prefs.lastNotifiedState === 'in-range' ? 'default' : 'destructive',
                    });
                    setLastNotifiedStateFrontend(prefs.lastNotifiedState); // Update frontend's tracked state
                }
            } else {
                // If notifications are disabled, ensure frontend state is reset
                setLastNotifiedStateFrontend(null);
            }
            setNotificationsEnabled(prefs.notificationsEnabled || false); // Keep frontend toggle in sync
        } catch (error) {
            console.error("Error polling for notification state:", error);
            // Don't show toast for every polling error, as it can be noisy
        }
    };

    // Start polling when component mounts and notifications are potentially enabled
    // Only poll if notifications are enabled from the initial load
    if (notificationsEnabled) {
        pollNotificationState(); // Run immediately
        notificationPollingInterval = setInterval(pollNotificationState, 5000); // Poll every 5 seconds
    } else {
        // If initially disabled, still set up the interval for future enablement
        // but only if it's not already running.
        notificationPollingInterval = setInterval(pollNotificationState, 5000); // Poll every 5 seconds regardless
    }


    return () => {
      if (notificationPollingInterval) {
        clearInterval(notificationPollingInterval);
      }
    };
  }, [lastNotifiedStateFrontend, notificationsEnabled, toast]); // Dependencies: lastNotifiedStateFrontend, notificationsEnabled, toast







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
        localStorage.setItem('email', email);
        setShowEmailDialog(false);
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
        await updateUserPreferences({ minRange, maxRange, lastNotifiedState: null });
        setActiveMinRange(minRange);
        setActiveMaxRange(maxRange);
        toast({
            title: "Success",
            description: `Notification range updated. Please re-enable notifications to apply changes.`,
        });
        if(notificationsEnabled) {
            setNotificationsEnabled(false);
            await updateUserPreferences({ notificationsEnabled: false });
        }
        
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
        await updateUserPreferences({ minRange: newMinRange, maxRange: newMaxRange, lastNotifiedState: null });
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

    if (newIsEnabled) {
        if (!email) {
            toast({
                title: "Error",
                description: "Please set a notification email first.",
                variant: "destructive"
            });
            return;
        }
        const min = parseFloat(minRange);
        const max = parseFloat(maxRange);
        if (min === 0 && max === 0) {
            toast({
                title: "Error",
                description: "Please set a notification range first.",
                variant: "destructive"
            });
            return;
        }

        try {
            const isOutOfRange = ratio > 0 && (ratio < min || ratio > max);
            const initialState = isOutOfRange ? 'out-of-range' : 'in-range';
            
            await updateUserPreferences({ 
                notificationsEnabled: true, 
                lastNotifiedState: initialState 
            });
            setNotificationsEnabled(true);
            
            toast({
                title: "Notifications Enabled",
                description: `Monitoring started. Initial state is ${initialState}.`,
            });
        } catch (e) {
            toast({
                title: "Error",
                description: "Failed to enable notifications.",
                variant: "destructive"
            });
        }
    } else {
        // Disabling notifications
        try {
            await updateUserPreferences({ notificationsEnabled: false, lastNotifiedState: null });
            setNotificationsEnabled(false);
            toast({
                title: "Success",
                description: "Notifications disabled.",
            });
        } catch (e) {
            toast({
                title: "Error",
                description: "Failed to update notification settings.",
                variant: "destructive"
            });
        }
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
            <div className="flex items-center gap-2 md:hidden">
                 <Dialog open={showEmailDialog} onOpenChange={setShowEmailDialog}>
                    <DialogTrigger asChild>
                        <Button variant="ghost" size="icon">
                            <Mail className="h-5 w-5" />
                            <span className="sr-only">Update Email</span>
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[425px]">
                        <DialogHeader>
                        <DialogTitle>Update Notification Email</DialogTitle>
                        <DialogDescription>
                            Enter the email address where you want to receive notifications.
                        </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="email" className="text-right">
                            Email
                            </Label>
                            <Input
                            id="email"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="col-span-3"
                            placeholder="you@example.com"
                            />
                        </div>
                        </div>
                        <DialogFooter>
                        <Button type="submit" onClick={handleUpdateEmail}>Save changes</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
                <Button variant="ghost" size="icon" onClick={toggleTheme}>
                    <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                    <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                    <span className="sr-only">Toggle theme</span>
                </Button>
            </div>
        </div>
        
        <div className="ml-auto hidden md:flex items-center gap-2">
             <Dialog open={showEmailDialog} onOpenChange={setShowEmailDialog}>
                <DialogTrigger asChild>
                    <Button variant="ghost" size="icon">
                        <Mail className="h-5 w-5" />
                        <span className="sr-only">Update Email</span>
                    </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                    <DialogTitle>Update Notification Email</DialogTitle>
                    <DialogDescription>
                        Enter the email address where you want to receive notifications.
                    </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="email-desktop" className="text-right">
                        Email
                        </Label>
                        <Input
                        id="email-desktop"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="col-span-3"
                        placeholder="you@example.com"
                        />
                    </div>
                    </div>
                    <DialogFooter>
                    <Button type="submit" onClick={handleUpdateEmail}>Save changes</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
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
}
