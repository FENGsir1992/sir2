import { Card, CardBody, CardHeader } from "@heroui/react";

export default function MigrationPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-800 mb-4">工作流迁移</h1>
        <p className="text-gray-600 text-lg">功能开发中，敬请期待</p>
      </div>

      <Card>
        <CardHeader>
          <h3 className="text-xl font-semibold">即将推出</h3>
        </CardHeader>
        <CardBody>
          <p className="text-gray-600">工作流迁移功能正在开发中，将支持从各大平台无缝迁移您的工作流。</p>
        </CardBody>
      </Card>
    </div>
  );
}