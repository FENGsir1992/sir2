import { Card, CardBody, Skeleton } from "@heroui/react";

export function WorkflowLoadingCard() {
  return (
    <Card shadow="sm" className="overflow-hidden w-full">
      <div className="relative bg-gradient-to-br from-gray-100 to-gray-200">
        <div className="pt-[60%]"></div>
        <Skeleton className="absolute top-2 left-2 w-20 h-6 rounded-md" />
        <Skeleton className="absolute top-2 right-2 w-16 h-6 rounded-md" />
      </div>
      <CardBody className="flex flex-col gap-1 p-2">
        <Skeleton className="w-full h-6 rounded-md mt-2" />
        <Skeleton className="w-3/4 h-6 rounded-md" />
        <div className="flex items-center justify-between mt-3">
          <div className="flex items-center gap-3">
            <Skeleton className="w-8 h-8 rounded-md" />
            <Skeleton className="w-20 h-4 rounded-md" />
          </div>
          <Skeleton className="w-24 h-8 rounded-md" />
        </div>
      </CardBody>
    </Card>
  );
}

export function WorkflowLoadingGrid({ count = 6 }: { count?: number }) {
  return (
    <div className="grid gap-6" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}>
      {Array.from({ length: count }).map((_, index) => (
        <WorkflowLoadingCard key={index} />
      ))}
    </div>
  );
}


