import { AlertCircle } from 'lucide-react';
import { Card } from '@/components/ui/Card';

interface AddUserTipsCardProps {
  tips?: string[];
}

const DEFAULT_TIPS = [
  'Verify the email is correct — credentials will be sent here.',
  'The user will be required to change the password on first login.',
  'Office assignment determines which documents they can access.',
];

export function AddUserTipsCard({ tips = DEFAULT_TIPS }: AddUserTipsCardProps) {
  return (
    <Card>
      <div className="flex items-start gap-2">
        <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
        <div className="text-xs text-slate-600">
          <p className="font-medium text-slate-900 mb-1">Before you submit</p>
          <ul className="space-y-1 list-disc pl-4">
            {tips.map(tip => (
              <li key={tip}>{tip}</li>
            ))}
          </ul>
        </div>
      </div>
    </Card>
  );
}
