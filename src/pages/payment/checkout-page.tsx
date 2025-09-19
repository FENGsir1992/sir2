import React from "react";
import { Card, CardBody, CardHeader, Button, Radio, RadioGroup, Divider } from "@heroui/react";
import { Icon } from "@iconify/react";
import { useNavigate } from "react-router-dom";

export default function CheckoutPage() {
  const navigate = useNavigate();
  const [paymentMethod, setPaymentMethod] = React.useState("alipay");
  const [selectedAddress, setSelectedAddress] = React.useState("1");
  
  const addresses = [
    {
      id: "1",
      name: "张三",
      phone: "13800138000",
      address: "北京市朝阳区某某街道某某小区1号楼101室",
      isDefault: true,
    },
    {
      id: "2",
      name: "李四",
      phone: "13900139000",
      address: "上海市浦东新区某某路某某号",
      isDefault: false,
    },
  ];

  const orderItems = [
    {
      id: 1,
      name: "智能手机",
      price: 2999,
      quantity: 1,
      image: "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=100",
    },
    {
      id: 2,
      name: "无线耳机",
      price: 299,
      quantity: 2,
      image: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=100",
    },
  ];

  const subtotal = orderItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const shipping = 0;
  const discount = 50;
  const total = subtotal + shipping - discount;

  const handlePayment = () => {
    // 模拟支付处理
    navigate("/orders");
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-4">
        <Button
          variant="light"
          startContent={<Icon icon="solar:arrow-left-bold-duotone" />}
          onClick={() => navigate(-1)}
        >
          返回
        </Button>
        <h1 className="text-3xl font-bold text-gray-800">确认订单</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 订单详情 */}
        <div className="lg:col-span-2 space-y-6">
          {/* 收货地址 */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Icon icon="solar:map-point-bold-duotone" className="text-primary" />
                <h3 className="text-lg font-semibold">收货地址</h3>
              </div>
            </CardHeader>
            <CardBody className="space-y-4">
              {addresses.map((addr) => (
                <div
                  key={addr.id}
                  className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                    selectedAddress === addr.id ? 'border-primary bg-primary-50' : 'border-gray-200'
                  }`}
                  onClick={() => setSelectedAddress(addr.id)}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">{addr.name}</span>
                        <span className="text-gray-600">{addr.phone}</span>
                        {addr.isDefault && (
                          <span className="text-xs bg-primary text-white px-2 py-1 rounded">默认</span>
                        )}
                      </div>
                      <p className="text-gray-600 mt-1">{addr.address}</p>
                    </div>
                     <Radio value={addr.id} />
                  </div>
                </div>
              ))}
              <Button
                variant="bordered"
                startContent={<Icon icon="solar:add-circle-bold-duotone" />}
                className="w-full"
              >
                添加新地址
              </Button>
            </CardBody>
          </Card>

          {/* 商品清单 */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Icon icon="solar:box-bold-duotone" className="text-primary" />
                <h3 className="text-lg font-semibold">商品清单</h3>
              </div>
            </CardHeader>
            <CardBody className="space-y-4">
              {orderItems.map((item) => (
                <div key={item.id} className="flex items-center gap-4">
                  <img
                    src={item.image}
                    alt={item.name}
                    className="w-16 h-16 object-cover rounded"
                  />
                  <div className="flex-1">
                    <h4 className="font-semibold">{item.name}</h4>
                    <p className="text-gray-600">数量: {item.quantity}</p>
                  </div>
                  <p className="font-bold text-primary">¥{item.price * item.quantity}</p>
                </div>
              ))}
            </CardBody>
          </Card>

          {/* 支付方式 */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Icon icon="solar:card-bold-duotone" className="text-primary" />
                <h3 className="text-lg font-semibold">支付方式</h3>
              </div>
            </CardHeader>
            <CardBody>
              <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod}>
                <Radio value="alipay" className="w-full">
                  <div className="flex items-center gap-3 p-2">
                    <Icon icon="logos:alipay" className="text-2xl" />
                    <span>支付宝</span>
                  </div>
                </Radio>
                <Radio value="wechat" className="w-full">
                  <div className="flex items-center gap-3 p-2">
                    <Icon icon="logos:wechat-icon" className="text-2xl" />
                    <span>微信支付</span>
                  </div>
                </Radio>
                <Radio value="card" className="w-full">
                  <div className="flex items-center gap-3 p-2">
                    <Icon icon="solar:card-bold-duotone" className="text-2xl text-blue-500" />
                    <span>银行卡</span>
                  </div>
                </Radio>
              </RadioGroup>
            </CardBody>
          </Card>
        </div>

        {/* 订单摘要 */}
        <div className="lg:col-span-1">
          <Card className="sticky top-4">
            <CardHeader>
              <h3 className="text-lg font-semibold">订单摘要</h3>
            </CardHeader>
            <CardBody className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>商品总价</span>
                  <span>¥{subtotal}</span>
                </div>
                <div className="flex justify-between">
                  <span>运费</span>
                  <span className="text-green-600">免费</span>
                </div>
                <div className="flex justify-between text-green-600">
                  <span>优惠券</span>
                  <span>-¥{discount}</span>
                </div>
                <Divider />
                <div className="flex justify-between text-lg font-bold">
                  <span>应付总额</span>
                  <span className="text-primary">¥{total}</span>
                </div>
              </div>

              <Button
                color="primary"
                size="lg"
                className="w-full"
                onClick={handlePayment}
                startContent={<Icon icon="solar:card-send-bold-duotone" />}
              >
                立即支付 ¥{total}
              </Button>

              <div className="text-xs text-gray-500 space-y-1">
                <p>• 支持7天无理由退货</p>
                <p>• 正品保证，假一赔十</p>
                <p>• 全国包邮，48小时发货</p>
              </div>
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}
