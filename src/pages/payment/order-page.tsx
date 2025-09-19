import React from "react";
import { Card, CardBody, CardHeader, Button, Chip, Input, Select, SelectItem } from "@heroui/react";
import { Icon } from "@iconify/react";
import { useNavigate } from "react-router-dom";
import { orderApi, paymentApi } from "../../utils/api-client";

type UiOrder = {
  id: string;
  date: string;
  status: string;
  statusText: string;
  total: number;
  items: { name: string; price: number; quantity: number; image?: string }[];
  address?: string | null;
  trackingNumber?: string | null;
};

export default function OrderPage() {
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = React.useState("all");
  const [searchQuery, setSearchQuery] = React.useState("");
  const [orders, setOrders] = React.useState<UiOrder[]>([]);
  const [loading, setLoading] = React.useState(false);

  const fetchOrders = React.useCallback(async () => {
    setLoading(true);
    try {
      const resp = await orderApi.getOrders({ page: 1, limit: 20 });
      if (resp?.success && Array.isArray(resp.data?.orders)) {
        const list: UiOrder[] = resp.data.orders.map((o: any) => ({
          id: o.id,
          date: new Date(o.createdAt).toLocaleString('zh-CN'),
          status: o.status,
          statusText: o.status === 'paid' ? '已完成' : o.status === 'pending' ? '待支付' : o.status,
          total: Number(o.totalAmount || 0),
          items: Array.isArray(o.items) ? o.items.map((it: any) => ({ name: it.title || '工作流', price: Number(it.price || 0), quantity: Number(it.quantity || 1) })) : [],
          address: o.shippingAddress || null,
          trackingNumber: o.trackingNumber || null,
        }));
        setOrders(list);
      } else {
        setOrders([]);
      }
    } catch {
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => { fetchOrders(); }, [fetchOrders]);

  const statusOptions = [
    { key: "all", label: "全部订单" },
    { key: "processing", label: "处理中" },
    { key: "shipping", label: "配送中" },
    { key: "completed", label: "已完成" },
    { key: "cancelled", label: "已取消" },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed": return "success";
      case "shipping": return "primary";
      case "processing": return "warning";
      case "cancelled": return "danger";
      default: return "default";
    }
  };

  const filteredOrders = orders.filter(order => {
    const matchesStatus = statusFilter === "all" || order.status === statusFilter;
    const matchesSearch = order.id.includes(searchQuery) || 
                         order.items.some(item => item.name.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesStatus && matchesSearch;
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-800">我的订单</h1>
        <Button
          variant="light"
          startContent={<Icon icon="solar:refresh-bold-duotone" />}
          onClick={fetchOrders}
        >
          刷新
        </Button>
      </div>

      {/* 搜索和筛选 */}
      <div className="flex flex-col sm:flex-row gap-4">
        <Input
          placeholder="搜索订单号或商品名称..."
          value={searchQuery}
          onValueChange={setSearchQuery}
          startContent={<Icon icon="solar:magnifer-bold-duotone" />}
          className="flex-1"
        />
        <Select
          placeholder="订单状态"
          selectedKeys={[statusFilter]}
          onSelectionChange={(keys) => setStatusFilter(Array.from(keys)[0] as string)}
          className="w-full sm:w-48"
        >
          {statusOptions.map((option) => (
            <SelectItem key={option.key}>
              {option.label}
            </SelectItem>
          ))}
        </Select>
      </div>

      {/* 订单列表 */}
      <div className="space-y-4">
        {filteredOrders.map((order) => (
          <Card key={order.id}>
            <CardHeader className="flex justify-between items-center">
              <div className="flex items-center gap-4">
                <div>
                  <p className="font-semibold">订单号: {order.id}</p>
                  <p className="text-sm text-gray-600">{order.date}</p>
                </div>
                <Chip color={getStatusColor(order.status === 'paid' ? 'completed' : order.status)} size="sm">
                  {order.statusText}
                </Chip>
              </div>
              <div className="text-right">
                <p className="font-bold text-primary">¥{order.total}</p>
                <p className="text-sm text-gray-600">{order.items.length} 件商品</p>
              </div>
            </CardHeader>
            <CardBody className="pt-0">
              <div className="space-y-4">
                {/* 商品列表 */}
                <div className="space-y-2">
                  {order.items.map((item, index) => (
                    <div key={index} className="flex items-center gap-4">
                      <img
                        src={item.image}
                        alt={item.name}
                        className="w-12 h-12 object-cover rounded"
                      />
                      <div className="flex-1">
                        <p className="font-medium">{item.name}</p>
                        <p className="text-sm text-gray-600">¥{item.price} × {item.quantity}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* 收货地址 */}
                <div className="flex items-start gap-2 text-sm text-gray-600">
                  <Icon icon="solar:map-point-bold-duotone" className="mt-0.5" />
                  <span>{order.address}</span>
                </div>

                {/* 物流信息 */}
                {order.trackingNumber && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Icon icon="solar:delivery-bold-duotone" />
                    <span>快递单号: {order.trackingNumber}</span>
                  </div>
                )}

                {/* 操作按钮 */}
                <div className="flex gap-2 pt-2">
                  {order.status === "shipping" && (
                    <Button size="sm" variant="bordered">
                      查看物流
                    </Button>
                  )}
                  {(order.status === "completed" || order.status === 'paid') && (
                    <>
                      <Button size="sm" variant="bordered">
                        申请售后
                      </Button>
                      <Button size="sm" variant="bordered">
                        再次购买
                      </Button>
                    </>
                  )}
                  {order.status === "processing" && (
                    <Button size="sm" color="danger" variant="bordered">
                      取消订单
                    </Button>
                  )}
                  {(order.status === 'pending' || order.status === 'processing') && (
                    <>
                      <Button size="sm" color="primary" onClick={() => {
                        const isMobile = /Mobile|Android|iPhone/i.test(navigator.userAgent);
                        paymentApi.createAlipay(order.id, isMobile ? 'wap' as any : 'page' as any)
                          .then((resp) => {
                            const url = (resp as any)?.data?.payUrl;
                            if (url) window.location.href = url as string; else navigate(`/payment/alipay/return?orderId=${encodeURIComponent(order.id)}`);
                          })
                          .catch(() => navigate(`/payment/alipay/return?orderId=${encodeURIComponent(order.id)}`));
                      }}>继续支付</Button>
                      <Button size="sm" variant="bordered" onClick={() => navigate(`/payment/alipay/return?orderId=${encodeURIComponent(order.id)}`)}>查看进度</Button>
                    </>
                  )}
                  <Button
                    size="sm"
                    color="primary"
                    variant="bordered"
                    onClick={() => navigate(`/orders/${order.id}`)}
                  >
                    查看详情
                  </Button>
                </div>
              </div>
            </CardBody>
          </Card>
        ))}
      </div>

      {filteredOrders.length === 0 && !loading && (
        <Card>
          <CardBody className="py-12">
            <div className="flex flex-col items-center gap-4">
              <Icon icon="solar:bill-list-bold-duotone" className="text-6xl text-gray-300" />
              <p className="text-gray-500">暂无相关订单</p>
              <Button color="primary" onClick={() => navigate("/shop")}>
                去购物
              </Button>
            </div>
          </CardBody>
        </Card>
      )}
    </div>
  );
}
