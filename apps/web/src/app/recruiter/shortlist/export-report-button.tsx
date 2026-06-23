'use client';

import { Download } from 'lucide-react';
import { Button } from '@/components/atoms/button';

export function ExportReportButton() {
  return (
    <Button
      type="button"
      variant="secondary"
      size="sm"
      leftIcon={<Download className="h-4 w-4" />}
      onClick={() => window.print()}
    >
      Export report
    </Button>
  );
}
