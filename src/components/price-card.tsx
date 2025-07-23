import { useEffect, useState } from 'react';
import Image from 'next/image';
import { ArrowUp, ArrowDown } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface PriceCardProps {
  tokenName: string;
  tokenSymbol: string;
  price: number;
  direction: 'up' | 'down' | 'none';
  imageUrl: string;
  imageHint: string;
}

export default function PriceCard({ tokenName, tokenSymbol, price, direction, imageUrl, imageHint }: PriceCardProps) {
  const [displayPrice, setDisplayPrice] = useState(price.toFixed(4));
  const [isUpdated, setIsUpdated] = useState(false);

  useEffect(() => {
    setDisplayPrice(price.toFixed(4));
    if (direction !== 'none') {
      setIsUpdated(true);
      const timer = setTimeout(() => {
        setIsUpdated(false);
      }, 500); 
      return () => clearTimeout(timer);
    }
  }, [price, direction]);

  const priceColor = direction === 'up' ? 'text-emerald-500' : 'text-red-500';
  const priceIcon = direction === 'up' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />;
  const flashAnimation = direction === 'up' ? 'animate-flash-up' : 'animate-flash-down';

  return (
    <Card className={cn('transition-shadow duration-300 hover:shadow-lg', isUpdated && flashAnimation)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="space-y-1">
          <CardTitle>{tokenName}</CardTitle>
          <div className="flex items-center gap-1">
            <CardDescription>{tokenSymbol}</CardDescription>
            {direction !== 'none' && (
              <div className={cn('flex items-center', priceColor)}>
                {priceIcon}
              </div>
            )}
          </div>
        </div>
        <div className="h-16 w-16 rounded-full overflow-hidden border-2 border-muted flex items-center justify-center">
            <Image
                src={imageUrl}
                alt={`${tokenName} logo`}
                width={80}
                height={80}
                data-ai-hint={imageHint}
                className="object-cover"
            />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-4xl font-bold">${displayPrice}</div>
        <div className='text-xs text-muted-foreground mt-1 invisible'>Price updated</div>
      </CardContent>
    </Card>
  );
}
