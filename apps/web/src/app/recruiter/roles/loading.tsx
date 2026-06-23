import { Card, CardBody } from '@/components/atoms/card';

export default function Loading() {
  return (
    <main className="mx-auto w-full max-w-6xl px-6 py-10">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between animate-pulse">
        <div>
          <div className="h-4 w-32 bg-[var(--surface-2)] rounded"></div>
          <div className="mt-2 h-10 w-64 bg-[var(--surface-2)] rounded"></div>
          <div className="mt-2 h-4 w-96 bg-[var(--surface-2)] rounded"></div>
        </div>
      </div>

      <div className="mt-8 grid gap-4">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardBody className="h-24 bg-[var(--surface-2)]"></CardBody>
          </Card>
        ))}
      </div>
    </main>
  );
}
