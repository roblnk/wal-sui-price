
import { useEffect, useState } from 'react';
import { ArrowUp, ArrowDown, ChevronUp, ChevronDown, CheckCircle2, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from "@/components/ui/switch";

interface RatioCardProps {
  ratio: number;
  direction: 'up' | 'down' | 'none';
  minRange: string;
  setMinRange: (value: string) => void;
  maxRange: string;
  setMaxRange: (value: string) => void;
  activeMinRange: string;
  activeMaxRange: string;
  onUpdate: () => void;
  onErase: () => void;
  notificationsEnabled: boolean;
  onToggleNotifications: () => void;
}

const formatValue = (value: number) => {
    return Math.max(0, value).toFixed(6);
};
  
const STEP = 0.000001;

export default function RatioCard({
  ratio,
  direction,
  minRange,
  setMinRange,
  maxRange,
  setMaxRange,
  activeMinRange,
  activeMaxRange,
  onUpdate,
  onErase,
  notificationsEnabled,
  onToggleNotifications,
}: RatioCardProps) {
  const [displayRatio, setDisplayRatio] = useState('0.000000');

  useEffect(() => {
    if (ratio !== undefined) {
      setDisplayRatio(ratio.toFixed(6));
    }
  }, [ratio]);

  const handleMinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (/^\d*\.?\d*$/.test(value)) {
      setMinRange(value);
    }
  };

  const handleMaxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (/^\d*\.?\d*$/.test(value)) {
      setMaxRange(value);
    }
  };

  const adjustMinRange = (amount: number) => {
    const current = parseFloat(minRange) || 0;
    setMinRange(formatValue(current + amount));
  };

  const adjustMaxRange = (amount: number) => {
    const current = parseFloat(maxRange) || 0;
    setMaxRange(formatValue(current + amount));
  };

  const ratioColor = direction === 'up' ? 'text-emerald-500' : 'text-red-500';
  const ratioIcon = direction === 'up' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />;
  
  const min = parseFloat(activeMinRange);
  const max = parseFloat(activeMaxRange);
  const isRangeSet = min > 0 || max > 0;
  
  const isInRange = isRangeSet && ratio > 0 && ratio >= min && ratio <= max;

  
  const rangeStatus = isRangeSet && ratio > 0 ? (
      isInRange ? (
          <div className="flex items-center gap-2 text-emerald-500 border border-emerald-500/50 rounded-md px-3 py-1 bg-emerald-500/10">
              <CheckCircle2 className="h-5 w-5" />
              <span className="font-medium">In range</span>
          </div>
      ) : (
          <div className="flex items-center gap-2 text-red-500 border border-red-500/50 rounded-md px-3 py-1 bg-red-500/10">
              <AlertTriangle className="h-5 w-5" />
              <span className="font-medium">Out of range!</span>
          </div>
      )
  ) : null;

  return (
    <Card className="h-full flex flex-col">
       <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
        <div className="space-y-1">
            <CardTitle className="flex items-center gap-2">
                <span>WAL/SUI Ratio</span>
            </CardTitle>
            <div className="flex items-center gap-1">
              <CardDescription>Live price ratio</CardDescription>
              {direction !== 'none' && (
                  <div className={cn('flex items-center', ratioColor)}>
                      {ratioIcon}
                  </div>
              )}
            </div>
        </div>
        {rangeStatus}
      </CardHeader>
      <CardContent className="flex-grow flex flex-col justify-between">
        <div>
            <div className="text-4xl font-bold">{displayRatio}</div>
            <div className="text-sm text-muted-foreground mt-2">
                <span>{activeMinRange}</span> - <span>{activeMaxRange}</span>
            </div>
        </div>
        <div className="space-y-4 pt-4">
            <div>
                 <Label className="text-xs font-semibold text-foreground/80">Ratio Range for Notifications</Label>
                <div className="flex items-center gap-2">
                    <div className="relative w-full">
                        <Input type="text" inputMode="numeric" placeholder="Min" value={minRange} onChange={handleMinChange} className="pr-8" />
                        <div className="absolute inset-y-0 right-0 flex flex-col justify-center">
                            <Button variant="ghost" size="icon" className="h-1/2 w-8 rounded-none" onClick={() => adjustMinRange(STEP)}><ChevronUp className="h-4 w-4" /></Button>
                            <Button variant="ghost" size="icon" className="h-1/2 w-8 rounded-none" onClick={() => adjustMinRange(-STEP)}><ChevronDown className="h-4 w-4" /></Button>
                        </div>
                    </div>
                    <span className="text-muted-foreground">-</span>
                    <div className="relative w-full">
                        <Input type="text" inputMode="numeric" placeholder="Max" value={maxRange} onChange={handleMaxChange} className="pr-8" />
                        <div className="absolute inset-y-0 right-0 flex flex-col justify-center">
                            <Button variant="ghost" size="icon" className="h-1/2 w-8 rounded-none" onClick={() => adjustMaxRange(STEP)}><ChevronUp className="h-4 w-4" /></Button>
                            <Button variant="ghost" size="icon" className="h-1/2 w-8 rounded-none" onClick={() => adjustMaxRange(-STEP)}><ChevronDown className="h-4 w-4" /></Button>
                        </div>
                    </div>
                </div>
            </div>
            <div className="flex gap-2">
                <Button onClick={onUpdate} className="w-full">Update Range</Button>
                <Button onClick={onErase} variant="outline" className="w-full">Erase</Button>
            </div>
            <div className="flex items-center justify-between pt-2">
                <Label htmlFor="notifications-switch" className="text-sm font-medium">
                    Enable Notifications
                </Label>
                <Switch
                    id="notifications-switch"
                    checked={notificationsEnabled}
                    onCheckedChange={onToggleNotifications}
                />
            </div>
        </div>
      </CardContent>
    </Card>
  );
}
