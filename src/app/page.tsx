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
import { sendOutOfRangeEmail } from '@/ai/flows/send-email-flow';
import { getWalPrice, getSuiPrice } from '@/services/price-feed';


export type PriceData = {
  price: number;
  direction: 'up' | 'down' | 'none';
};

export default function Home() {
  const [walPrice, setWalPrice] = useState<PriceData>({ price: 0, direction: 'none' });
  const [suiPrice, setSuiPrice] = useState<PriceData>({ price: 0, direction: 'none' });
  const [ratio, setRatio] = useState<number>(0);
  const [lastRatio, setLastRatio] = useState<number | null>(null);
  const [theme, setTheme] = useState('light');
  const [minRange, setMinRange] = useState("0.000000");
  const [maxRange, setMaxRange] = useState("0.000000");
  const [activeMinRange, setActiveMinRange] = useState("0.000000");
  const [activeMaxRange, setActiveMaxRange] = useState("0.000000");
  const [email, setEmail] = useState("");
  const [notificationEmail, setNotificationEmail] = useState("");
  const [showEraseAlert, setShowEraseAlert] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [notificationSent, setNotificationSent] = useState(false);
  const { toast } = useToast();

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    document.documentElement.classList.toggle('dark', newTheme === 'dark');
  };
  
  const handleUpdateEmail = () => {
    if(!email) {
        toast({
            title: "Error",
            description: "Please enter an email address.",
            variant: "destructive"
        });
        return;
    }
    setNotificationEmail(email);
    toast({
        title: "Success",
        description: `Notification email updated to ${email}.`,
    });
  };

  const handleUpdateRange = () => {
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

    setActiveMinRange(minRange);
    setActiveMaxRange(maxRange);

    toast({
        title: "Success",
        description: `Notification range updated.`,
    });
  };

  const handleEraseRange = () => {
    setMinRange("0.000000");
    setMaxRange("0.000000");
    setActiveMinRange("0.000000");
    setActiveMaxRange("0.000000");
    setShowEraseAlert(false);
    toast({
        title: "Success",
        description: "Notification range has been erased.",
    });
  };

  useEffect(() => {
    const fetchWalPrice = async () => {
      try {
        const price = await getWalPrice();
        setWalPrice(prev => ({
          price: price,
          direction: price > prev.price ? 'up' : 'down'
        }));
      } catch (error) {
        console.error("Failed to fetch WAL price:", error);
      }
    };

    const fetchSuiPrice = async () => {
      try {
        const price = await getSuiPrice();
        setSuiPrice(prev => ({
          price: price,
          direction: price > prev.price ? 'up' : 'down'
        }));
      } catch (error) {
        console.error("Failed to fetch SUI price:", error);
      }
    };

    fetchWalPrice();
    fetchSuiPrice();
    const walInterval = setInterval(fetchWalPrice, 1000);
    const suiInterval = setInterval(fetchSuiPrice, 1000);

    return () => {
      clearInterval(walInterval);
      clearInterval(suiInterval);
    };
  }, []);

  useEffect(() => {
    if (walPrice.price > 0 && suiPrice.price > 0) {
      const newRatio = walPrice.price / suiPrice.price;
      setLastRatio(ratio);
      setRatio(newRatio);
    }
  }, [walPrice, suiPrice, ratio]);

  const sendNotification = useCallback(async () => {
    if (!notificationEmail) {
      toast({
        title: 'Out of Range Alert',
        description: `The WAL/SUI ratio is out of the set range.`,
        variant: 'destructive',
      });
    } else {
      try {
        await sendOutOfRangeEmail({
          to: notificationEmail,
          ratio,
          minRange: parseFloat(activeMinRange),
          maxRange: parseFloat(activeMaxRange)
        });
        toast({
          title: 'Out of Range Alert',
          description: `The WAL/SUI ratio is out of the set range. A notification has been sent to ${notificationEmail}.`,
          variant: 'destructive',
        });
      } catch (error) {
        console.error("Failed to send email:", error);
        toast({
          title: 'Out of Range Alert',
          description: `The WAL/SUI ratio is out of range, but we failed to send an email to ${notificationEmail}.`,
          variant: 'destructive',
        });
      }
    }
    setNotificationSent(true);
  }, [notificationEmail, ratio, activeMinRange, activeMaxRange, toast]);

  useEffect(() => {
    const min = parseFloat(activeMinRange);
    const max = parseFloat(activeMaxRange);
    const isRangeSet = min > 0 || max > 0;
    const isOutOfRange = isRangeSet && (ratio < min || ratio > max);
    const isInRange = isRangeSet && !isOutOfRange;

    if (notificationsEnabled) {
      if (isOutOfRange) {
        if (!notificationSent) {
          sendNotification();
        }
      } else if (isInRange) {
        if (notificationSent) {
          setNotificationSent(false);
        }
      }
    }
  }, [ratio, activeMinRange, activeMaxRange, notificationsEnabled, notificationSent, sendNotification]);


  const ratioDirection = lastRatio ? (ratio > lastRatio ? 'up' : 'down') : 'none';

  return (
    <div className="flex min-h-screen w-full flex-col">
      <header className="sticky top-0 z-10 flex h-16 items-center gap-4 border-b bg-background/80 backdrop-blur-sm px-4 md:px-6">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold tracking-tight">Turbo Tracker</h1>
        </div>
        <div className="flex items-center gap-2 ml-4">
            <div className="relative w-72">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                    id="email-header" 
                    type="email" 
                    placeholder="Enter your email here!" 
                    className="pl-9 h-8"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                />
            </div>
            <Button size="sm" className="h-8" onClick={handleUpdateEmail}>Update</Button>
        </div>
        <div className="ml-auto">
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
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              <RatioCard
                ratio={ratio}
                direction={ratioDirection}
                minRange={minRange}
                setMinRange={setMinRange}
                maxRange={maxRange}
                setMaxRange={setMaxRange}
                activeMinRange={activeMinRange}
                activeMaxRange={activeMaxRange}
                onUpdate={handleUpdateRange}
                onErase={() => setShowEraseAlert(true)}
                notificationsEnabled={notificationsEnabled}
                onToggleNotifications={() => setNotificationsEnabled(!notificationsEnabled)}
              />
              <PriceCard 
                tokenName="Walrus"
                tokenSymbol="WAL"
                price={walPrice.price}
                direction={walPrice.direction}
                imageUrl="https://placehold.co/80x80.png"
                imageHint="walrus"
              />
              <PriceCard 
                tokenName="Sui"
                tokenSymbol="SUI"
                price={suiPrice.price}
                direction={suiPrice.direction}
                imageUrl="https://placehold.co/80x80.png"
                imageHint="water wave"
              />
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
