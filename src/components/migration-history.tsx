import React from "react";
import { 
  Table, 
  TableHeader, 
  TableColumn, 
  TableBody, 
  TableRow, 
  TableCell,
  Chip,
  Button,
  Pagination
} from "@heroui/react";
import { Icon } from "@iconify/react";

type MigrationStatus = "completed" | "failed" | "in-progress";

interface MigrationRecord {
  id: string;
  date: string;
  source: string;
  target: string;
  status: MigrationStatus;
  nodes: number;
}

const statusColorMap: Record<MigrationStatus, "success" | "danger" | "warning"> = {
  "completed": "success",
  "failed": "danger",
  "in-progress": "warning",
};

const statusTextMap: Record<MigrationStatus, string> = {
  "completed": "已完成",
  "failed": "失败",
  "in-progress": "进行中",
};

export const MigrationHistory: React.FC = () => {
  const [page, setPage] = React.useState(1);
  const rowsPerPage = 5;
  
  const migrations: MigrationRecord[] = [
    { 
      id: "wf-001", 
      date: "2024-07-10 14:30", 
      source: "Langflow", 
      target: "Flowise", 
      status: "completed", 
      nodes: 12 
    },
    { 
      id: "wf-002", 
      date: "2024-07-09 10:15", 
      source: "Flowise", 
      target: "Langflow", 
      status: "completed", 
      nodes: 8 
    },
    { 
      id: "wf-003", 
      date: "2024-07-08 16:45", 
      source: "Langflow", 
      target: "Logseq", 
      status: "failed", 
      nodes: 15 
    },
    { 
      id: "wf-004", 
      date: "2024-07-07 09:20", 
      source: "Logseq", 
      target: "Flowise", 
      status: "completed", 
      nodes: 6 
    },
    { 
      id: "wf-005", 
      date: "2024-07-06 11:30", 
      source: "Flowise", 
      target: "Langflow", 
      status: "in-progress", 
      nodes: 10 
    },
    { 
      id: "wf-006", 
      date: "2024-07-05 13:45", 
      source: "Langflow", 
      target: "Flowise", 
      status: "completed", 
      nodes: 9 
    },
    { 
      id: "wf-007", 
      date: "2024-07-04 15:10", 
      source: "Logseq", 
      target: "Langflow", 
      status: "completed", 
      nodes: 7 
    },
  ];
  
  const pages = Math.ceil(migrations.length / rowsPerPage);
  const items = React.useMemo(() => {
    const start = (page - 1) * rowsPerPage;
    const end = start + rowsPerPage;
    
    return migrations.slice(start, end);
  }, [page, migrations]);
  
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h3 className="text-lg font-semibold">迁移历史</h3>
        <p className="text-gray-600 mt-1">
          查看您之前的工作流迁移记录和状态。
        </p>
      </div>
      
      <Table 
        aria-label="Migration history table"
        removeWrapper
        bottomContent={
          <div className="flex w-full justify-center">
            <Pagination
              isCompact
              showControls
              showShadow
              color="primary"
              page={page}
              total={pages}
              onChange={(page) => setPage(page)}
            />
          </div>
        }
      >
        <TableHeader>
          <TableColumn>ID</TableColumn>
          <TableColumn>日期</TableColumn>
          <TableColumn>源平台</TableColumn>
          <TableColumn>目标平台</TableColumn>
          <TableColumn>节点数</TableColumn>
          <TableColumn>状态</TableColumn>
          <TableColumn>操作</TableColumn>
        </TableHeader>
        <TableBody items={items}>
          {(item) => (
            <TableRow key={item.id}>
              <TableCell>{item.id}</TableCell>
              <TableCell>{item.date}</TableCell>
              <TableCell>{item.source}</TableCell>
              <TableCell>{item.target}</TableCell>
              <TableCell>{item.nodes}</TableCell>
              <TableCell>
                <Chip 
                  color={statusColorMap[item.status]} 
                  variant="flat"
                  size="sm"
                >
                  {statusTextMap[item.status]}
                </Chip>
              </TableCell>
              <TableCell>
                <div className="flex gap-2">
                  <Button 
                    isIconOnly 
                    size="sm" 
                    variant="light"
                    aria-label="View details"
                  >
                    <Icon icon="lucide:eye" className="text-lg" />
                  </Button>
                  <Button 
                    isIconOnly 
                    size="sm" 
                    variant="light"
                    aria-label="Download report"
                    isDisabled={item.status !== "completed"}
                  >
                    <Icon icon="lucide:download" className="text-lg" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
};