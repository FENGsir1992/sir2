import React from "react";
import { Card, CardBody, Button, Input, Chip, Pagination } from "@heroui/react";
import { Icon } from "@iconify/react";

type WorkflowItem = {
  id: string;
  name: string;
  description: string;
  tags: string[];
};

const MOCK_WORKFLOWS: WorkflowItem[] = [
  {
    id: "wf-1",
    name: "电商下单自动化",
    description: "从商品选择到下单支付的自动化流程。",
    tags: ["电商", "自动化", "表单"],
  },
  {
    id: "wf-2",
    name: "客服工单分派",
    description: "根据优先级自动路由与 SLA 监控。",
    tags: ["客服", "SLA", "路由"],
  },
  {
    id: "wf-3",
    name: "内容审核流水线",
    description: "文本/图片多模态审核与复检。",
    tags: ["审核", "多模态", "安全"],
  },
  {
    id: "wf-4",
    name: "合同审批流",
    description: "多级审批与电子签集成。",
    tags: ["审批", "电子签", "合规"],
  },
];

export const WorkflowStore = React.memo(() => {
  const [keyword, setKeyword] = React.useState("");
  const [page, setPage] = React.useState(1);

  // 优化：缓存工作流数据
  const workflows = React.useMemo(() => MOCK_WORKFLOWS, []);

  const filtered = React.useMemo(() => {
    const k = keyword.trim();
    if (!k) return workflows;
    return workflows.filter((w) =>
      `${w.name} ${w.description} ${w.tags.join(" ")}`.toLowerCase().includes(k.toLowerCase())
    );
  }, [keyword, workflows]);

  const pageSize = 8;
  const pageCount = React.useMemo(() => 
    Math.max(1, Math.ceil(filtered.length / pageSize)), 
    [filtered.length, pageSize]
  );
  
  const paged = React.useMemo(() => 
    filtered.slice((page - 1) * pageSize, page * pageSize),
    [filtered, page, pageSize]
  );

  React.useEffect(() => {
    setPage(1);
  }, [keyword]);

  return (
    <section id="workflow-store" className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <h2 className="text-xl font-semibold text-gray-800">工作流商店</h2>
        <div className="flex items-center gap-3 w-full md:w-auto">
          <Input
            value={keyword}
            onValueChange={setKeyword}
            placeholder="搜索工作流..."
            startContent={<Icon icon="lucide:search" className="text-gray-500" />}
            className="w-full md:w-72"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {paged.map((w) => (
          <Card key={w.id} className="h-full">
            <CardBody className="flex flex-col gap-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="text-base font-medium text-gray-800">{w.name}</div>
                  <div className="text-sm text-gray-500 mt-1">{w.description}</div>
                </div>
                <Icon icon="lucide:workflow" className="text-primary text-xl" />
              </div>
              <div className="flex flex-wrap gap-2">
                {w.tags.map((t) => (
                  <Chip key={t} size="sm" variant="flat" color="primary">{t}</Chip>
                ))}
              </div>
              <div className="flex gap-2 mt-2">
                <Button color="primary" startContent={<Icon icon="lucide:plus" />}>添加到我的工作流</Button>
                <Button variant="flat" onPress={() => (window.location.hash = "/store")}>查看详情</Button>
              </div>
            </CardBody>
          </Card>
        ))}
      </div>

      <div className="flex justify-end">
        <Pagination
          total={pageCount}
          page={page}
          onChange={setPage}
          showControls
        />
      </div>
    </section>
  );
});

WorkflowStore.displayName = 'WorkflowStore';

export default WorkflowStore;


