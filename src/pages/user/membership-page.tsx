import { useState } from "react";
import { Card, Button, Chip } from "@heroui/react";
import { Icon } from "@iconify/react";
import EditableSection from "../../components/EditableSection";
import { useUser } from "../../contexts/AppContext";

export default function MembershipPage() {
  const [selectedAmount, setSelectedAmount] = useState(20);
  const [paymentMethod, setPaymentMethod] = useState("wechat");
  // 从全局用户上下文获取昵称与余额
  const { user } = useUser();
  const nickname = user?.name || "未设置";
  const userBalance = typeof user?.balance === "number" ? user.balance as number : 0;

  const rechargeAmounts = [20, 50, 100, 300, 500];

  const rechargeBenefits = [
    { amount: 50, bonus: 3, highlight: false },
    { amount: 100, bonus: 10, highlight: false },
    { amount: 500, bonus: 75, highlight: true },
  ];

  return (
    <div className="h-full bg-gray-50 overflow-hidden">
      {/* 全屏主内容 */}
      <section className="h-full flex flex-col overflow-hidden">
        {/* 顶部标题栏 */}
        <div className="px-6 py-4">
          <div className="flex items-center justify-start">
            <div className="flex items-center gap-3">
              {/* 将两行信息放到原方形图标位置 */}
              <div className="flex flex-col items-start gap-1">
                {/* 昵称 行 */}
                <div className="flex items-center gap-1.5 h-7 px-2 rounded-lg bg-gradient-to-r from-violet-50 to-fuchsia-50 border border-violet-200 shadow-sm">
                  <span className="relative w-4 h-4 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white flex items-center justify-center ring-1 ring-white/70 shadow-[0_2px_8px_rgba(168,85,247,0.35)]">
                    <Icon icon="solar:id-bold" className="text-[10px]" />
                  </span>
                  <span className="text-[11px] text-gray-600 leading-none">昵称：</span>
                  <span className="text-[11px] font-semibold text-violet-700 tracking-wide leading-none">{nickname}</span>
                </div>
                {/* 余额 行 */}
                <div className="flex items-center gap-1.5 h-7 px-2 rounded-lg bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 shadow-sm">
                  <span className="relative w-4 h-4 rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 text-white flex items-center justify-center ring-1 ring-white/70 shadow-[0_2px_8px_rgba(16,185,129,0.35)]">
                    <Icon icon="solar:wallet-money-bold-duotone" className="text-[10px]" />
                  </span>
                  <span className="text-[11px] text-gray-600 leading-none">余额：</span>
                  <span className="text-[11px] font-semibold text-emerald-700 tracking-wide leading-none">¥{userBalance.toFixed(2)}</span>
                </div>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-800"></h1>
                <p className="text-sm text-gray-500"></p>
              </div>
            </div>
          </div>
        </div>

        {/* 退订说明 */}
        <div className="bg-purple-50 border border-purple-200 rounded-lg mx-6 mt-1 mb-1 p-3">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
              <Icon icon="lucide:info" className="text-purple-600 text-sm" />
            </div>
            <p className="text-sm text-purple-700">基于产品的特殊性，一旦您完成付款，本产品不支持退订。购买前请仔细阅读产品权益</p>
          </div>
        </div>
        
        <div className="flex-1 px-6 pb-6 overflow-y-auto overflow-x-hidden min-h-0">

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-5 items-start">
            {/* 左列：会员套餐（大卡） */}
            <EditableSection page="membership" section="plans">
            <div className="space-y-3 mt-6">
              <Card className="p-6 bg-white rounded-2xl shadow-lg min-h-[600px]">
                <div className="flex items-center gap-2 mb-4">
                  <div className="p-2 bg-purple-600 rounded-lg">
                    <Icon icon="solar:crown-bold-duotone" className="text-white text-lg" />
                  </div>
                  <h2 className="text-lg font-bold text-gray-800">会员套餐</h2>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  {/* SVIP年卡会员 */}
                  <div className="relative bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl p-3 border border-purple-200">
                    <div className="absolute -top-2 -right-2 bg-red-500 text-white text-xs px-3 py-1 rounded-full transform rotate-12">
                      限时特惠
                    </div>
                    <div className="flex justify-center mb-2">
                      <div className="w-12 h-12 bg-purple-500 rounded-xl flex items-center justify-center">
                        <Icon icon="solar:diamond-bold" className="text-white text-xl" />
                      </div>
                    </div>
                    <h3 className="text-center text-base font-bold text-purple-600 mb-1">SVIP年卡会员</h3>
                    <div className="flex justify-center mb-3">
                      <span className="bg-orange-400 text-white text-sm px-3 py-1 rounded-full">1.2折</span>
                    </div>
                    <div className="text-center mb-4">
                      <span className="text-xl font-bold text-purple-600">¥398</span>
                      <span className="text-gray-400 line-through ml-2 text-xs">¥4980</span>
                    </div>
                    <div className="space-y-1 mb-3">
                      <div className="flex items-start gap-2">
                        <Icon icon="solar:check-circle-bold" className="text-green-500 text-sm mt-0.5 flex-shrink-0" />
                        <span className="text-xs text-gray-700 whitespace-nowrap">Svip专区工作流</span>
                        <span className="text-purple-600 text-xs whitespace-nowrap">免费下载压缩包</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <Icon icon="solar:check-circle-bold" className="text-green-500 text-sm mt-0.5 flex-shrink-0" />
                        <span className="text-xs text-gray-700 whitespace-nowrap">全场创作者工作流</span>
                        <span className="text-purple-600 text-xs whitespace-nowrap">五折优惠</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <Icon icon="solar:check-circle-bold" className="text-green-500 text-sm mt-0.5 flex-shrink-0" />
                        <span className="text-xs text-gray-700 whitespace-nowrap">解锁</span>
                        <span className="text-purple-600 text-xs whitespace-nowrap">SVIP课程</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <Icon icon="solar:check-circle-bold" className="text-green-500 text-sm mt-0.5 flex-shrink-0" />
                        <span className="text-xs text-gray-700 whitespace-nowrap">云端</span>
                        <span className="text-purple-600 text-xs whitespace-nowrap">极速通道高速合成</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <Icon icon="solar:check-circle-bold" className="text-green-500 text-sm mt-0.5 flex-shrink-0" />
                        <span className="text-xs text-gray-700 whitespace-nowrap">推广分成比例提升至</span>
                        <span className="text-purple-600 text-xs whitespace-nowrap">50%</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <Icon icon="solar:check-circle-bold" className="text-green-500 text-sm mt-0.5 flex-shrink-0" />
                        <span className="text-xs text-gray-700 whitespace-nowrap">极芮AIGC插件专用</span>
                        <span className="text-purple-600 text-xs whitespace-nowrap">最大折扣</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <Icon icon="solar:check-circle-bold" className="text-green-500 text-sm mt-0.5 flex-shrink-0" />
                        <span className="text-xs text-gray-700 whitespace-nowrap">每日签到领取最高</span>
                        <span className="text-purple-600 text-xs whitespace-nowrap">4元红包</span>
                      </div>
                    </div>
                    <Button className="w-full bg-gradient-to-r from-purple-500 to-purple-600 text-white font-bold py-3 rounded-xl">
                      立即开通
                    </Button>
                  </div>

                  {/* VIP年卡会员 */}
                  <div className="relative bg-gradient-to-br from-blue-50 to-purple-50 rounded-2xl p-3 border border-blue-200">
                    <div className="flex justify-center mb-2">
                      <div className="w-12 h-12 bg-purple-500 rounded-xl flex items-center justify-center">
                        <Icon icon="solar:crown-bold" className="text-white text-xl" />
                      </div>
                    </div>
                    <h3 className="text-center text-base font-bold text-purple-600 mb-1">SVIP用户年卡</h3>
                    <div className="flex justify-center mb-3">
                      <span className="bg-orange-400 text-white text-sm px-3 py-1 rounded-full">4.3折</span>
                    </div>
                    <div className="text-center mb-4">
                      <span className="text-xl font-bold text-purple-600">¥299</span>
                      <span className="text-gray-400 line-through ml-2 text-xs">¥699</span>
                    </div>
                    <div className="space-y-1 mb-3">
                      <div className="flex items-start gap-2">
                        <Icon icon="solar:check-circle-bold" className="text-green-500 text-sm mt-0.5 flex-shrink-0" />
                        <span className="text-xs text-gray-700 whitespace-nowrap">创作者工作流8折优惠</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <Icon icon="solar:check-circle-bold" className="text-green-500 text-sm mt-0.5 flex-shrink-0" />
                        <span className="text-xs text-gray-700 whitespace-nowrap">推广分成比例提升至35%</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <Icon icon="solar:check-circle-bold" className="text-green-500 text-sm mt-0.5 flex-shrink-0" />
                        <span className="text-xs text-gray-700 whitespace-nowrap">解锁SVIP用户课程</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <Icon icon="solar:check-circle-bold" className="text-green-500 text-sm mt-0.5 flex-shrink-0" />
                        <span className="text-xs text-gray-700 whitespace-nowrap">解锁文件上传功能</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <Icon icon="solar:check-circle-bold" className="text-green-500 text-sm mt-0.5 flex-shrink-0" />
                        <span className="text-xs text-gray-700 whitespace-nowrap">AIGC插件基础折扣</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <Icon icon="solar:check-circle-bold" className="text-green-500 text-sm mt-0.5 flex-shrink-0" />
                        <span className="text-xs text-gray-700 whitespace-nowrap">每日签到领取最高2元红包</span>
                      </div>
                    </div>
                    <Button className="w-full bg-purple-500 text-white font-bold py-3 rounded-xl">
                      立即开通
                    </Button>
                  </div>

                  {/* VIP月卡 */}
                  <div className="relative bg-gradient-to-br from-purple-50 to-blue-50 rounded-2xl p-3 border border-purple-200">
                    <div className="flex justify-center mb-2">
                      <div className="w-12 h-12 bg-purple-500 rounded-xl flex items-center justify-center">
                        <Icon icon="solar:crown-bold" className="text-white text-xl" />
                      </div>
                    </div>
                    <h3 className="text-center text-base font-bold text-purple-600 mb-1">SVIP用户月卡</h3>
                    <div className="flex justify-center mb-3">
                      <span className="bg-orange-400 text-white text-sm px-3 py-1 rounded-full">6.0折</span>
                    </div>
                    <div className="text-center mb-4">
                      <span className="text-xl font-bold text-purple-600">¥39.8</span>
                      <span className="text-gray-400 line-through ml-2 text-xs">¥99</span>
                    </div>
                    <div className="space-y-1 mb-3">
                      <div className="flex items-start gap-2">
                        <Icon icon="solar:check-circle-bold" className="text-green-500 text-sm mt-0.5 flex-shrink-0" />
                        <span className="text-xs text-gray-700 whitespace-nowrap">创作者工作流8折优惠</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <Icon icon="solar:check-circle-bold" className="text-green-500 text-sm mt-0.5 flex-shrink-0" />
                        <span className="text-xs text-gray-700 whitespace-nowrap">推广分成比例提升至35%</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <Icon icon="solar:check-circle-bold" className="text-green-500 text-sm mt-0.5 flex-shrink-0" />
                        <span className="text-xs text-gray-700 whitespace-nowrap">解锁SVIP用户课程</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <Icon icon="solar:check-circle-bold" className="text-green-500 text-sm mt-0.5 flex-shrink-0" />
                        <span className="text-xs text-gray-700 whitespace-nowrap">解锁文件上传功能</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <Icon icon="solar:check-circle-bold" className="text-green-500 text-sm mt-0.5 flex-shrink-0" />
                        <span className="text-xs text-gray-700 whitespace-nowrap">AIGC插件基础折扣</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <Icon icon="solar:check-circle-bold" className="text-green-500 text-sm mt-0.5 flex-shrink-0" />
                        <span className="text-xs text-gray-700 whitespace-nowrap">每日签到领取最高2元红包</span>
                      </div>
                    </div>
                    <Button className="w-full bg-purple-500 text-white font-bold py-3 rounded-xl">
                      立即开通
                    </Button>
                  </div>
                </div>
              </Card>
            </div>
            </EditableSection>

            {/* 右列：充值优惠 + 充值金额（上下叠放） */}
            <EditableSection page="membership" section="benefits-and-amounts">
            <div className="flex flex-col gap-3 min-h-[600px] mt-6">
              {/* 充值优惠（上方横条，美化） */}
              <Card className="p-6 flex-shrink-0 bg-gradient-to-r from-rose-50 via-orange-50 to-amber-50 border border-amber-200">
                <div className="flex items-center gap-2 mb-1 relative -top-3">
                  <Icon icon="solar:gift-bold-duotone" className="text-red-500 text-base md:text-lg" />
                  <h3 className="font-bold text-gray-800 text-base md:text-lg tracking-wide mb-1 leading-none">充值优惠</h3>
                </div>
                <div className="flex flex-col gap-2">
                  {/* 提示条 */}
                  <div className="rounded-full overflow-hidden bg-gradient-to-br from-purple-400/70 to-purple-500/70 text-white px-2.5 py-1 flex items-center gap-2 backdrop-blur-sm shadow-sm w-[284px] border border-white/30">
                    <div className="w-4 h-4 rounded-full bg-white/25 flex items-center justify-center">
                      <Icon icon="solar:info-circle-bold" className="text-white text-xs" />
                    </div>
                    <p className="text-xs leading-none whitespace-nowrap">此充值仅用于极芮AIGC插件功能调用充值使用</p>
                  </div>
                  
                  {/* 主要内容区域 */}
                  <div className="flex items-center">
                    {/* 左侧：三张优惠卡片 */}
                    <div className="flex gap-1">
                      {rechargeBenefits.map((benefit, index) => (
                        <div
                          key={index}
                          className={`group relative rounded-lg border transition-all duration-200 w-[92px] h-10 px-2 py-1 overflow-hidden ${
                            benefit.highlight
                              ? "bg-yellow-50 border-yellow-300 shadow-[0_4px_12px_rgba(234,179,8,0.22)]"
                              : "bg-white border-gray-200 hover:shadow-md"
                          }`}
                        >
                          <div className="absolute inset-0 rounded-lg pointer-events-none">
                            <div className="gold-flow opacity-60"></div>
                          </div>
                          <div className="text-center relative flex items-center justify-center h-full">
                            <p className="text-xs text-gray-800 whitespace-nowrap leading-none">
                              充{benefit.amount}元送{benefit.bonus}元
                            </p>
                            {benefit.highlight && !(benefit.amount === 500 && benefit.bonus === 75) && (
                              <Chip size="sm" color="danger" className="ml-1 text-[10px] glow-chip whitespace-nowrap">推荐</Chip>
                            )}
                          </div>
                          <span className="absolute inset-0 rounded-lg ring-0 group-hover:ring-2 group-hover:ring-amber-300/60 transition-all duration-200"></span>
                          <span className="absolute -inset-8 bg-gradient-to-r from-amber-200/0 via-amber-200/30 to-amber-200/0 opacity-0 group-hover:opacity-60 rotate-12 transition-opacity duration-300"></span>
                        </div>
                      ))}
                    </div>

                    {/* 联系专属客服文案块 */}
                    <div className="rounded-xl bg-gradient-to-br from-purple-500 to-fuchsia-500 text-white px-3 py-2 shadow-md h-10 flex items-center gap-2 whitespace-nowrap ml-auto mr-0">
                      <Icon icon="solar:users-group-rounded-bold" className="text-yellow-300 text-sm" />
                      <span className="text-xs font-semibold leading-none">联系专属客服 · </span>
                      <span className="text-xs text-yellow-200 leading-none">充值越多送的越多</span>
                    </div>
                  </div>
                </div>
              </Card>

              {/* 充值金额（方形卡） */}
              <Card className="p-6 flex-1 flex flex-col">
                <div className="mb-0">
                  <div className="flex items-center gap-2 mb-2 relative -top-3">
                    <Icon icon="solar:wallet-money-bold-duotone" className="text-purple-500 text-base md:text-lg" />
                    <h4 className="font-bold text-gray-800 text-base md:text-lg tracking-wide mb-1 leading-none">充值金额</h4>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {rechargeAmounts.map((amount) => (
                      <Button
                        key={amount}
                        variant={selectedAmount === amount ? "solid" : "bordered"}
                        color={selectedAmount === amount ? "primary" : "default"}
                        onClick={() => setSelectedAmount(amount)}
                        className={`${selectedAmount === amount ? "shadow-[0_8px_24px_rgba(124,58,237,0.35)] bg-gradient-to-r from-purple-500 to-fuchsia-500 text-white" : "hover:shadow-md"} min-w-[84px] h-10 text-xs rounded-xl transition-all duration-200 hover:-translate-y-0.5 hover:ring-2 hover:ring-purple-200 active:scale-[0.98]`}
                        size="sm"
                      >
                        ￥{amount}
                      </Button>
                    ))}
                  </div>
                </div>

                <div className="mt-6 mb-6">
                  <div className="flex items-center gap-2 mb-3">
                    <Icon icon="solar:card-bold-duotone" className="text-purple-500" />
                    <h4 className="font-bold text-gray-800 text-sm">支付方式</h4>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div
                      className={`p-3 border-2 rounded-lg cursor-pointer transition-all ${
                        paymentMethod === "wechat" ? "border-green-500 bg-green-50" : "border-gray-200 hover:border-gray-300"
                      }`}
                      onClick={() => setPaymentMethod("wechat")}
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 bg-green-500 rounded flex items-center justify-center">
                          <Icon icon="simple-icons:wechat" className="text-white text-sm" />
                        </div>
                        <span className="font-medium text-xs">微信支付</span>
                        {paymentMethod === "wechat" && (
                          <Icon icon="solar:check-circle-bold" className="text-green-500 ml-auto text-sm" />
                        )}
                      </div>
                    </div>
                    <div
                      className={`p-3 border-2 rounded-lg cursor-pointer transition-all ${
                        paymentMethod === "alipay" ? "border-blue-500 bg-blue-50" : "border-gray-200 hover:border-gray-300"
                      }`}
                      onClick={() => setPaymentMethod("alipay")}
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 bg-blue-500 rounded flex items-center justify-center">
                          <Icon icon="simple-icons:alipay" className="text-white text-sm" />
                        </div>
                        <span className="font-medium text-xs">支付宝支付</span>
                        {paymentMethod === "alipay" && (
                          <Icon icon="solar:check-circle-bold" className="text-blue-500 ml-auto text-sm" />
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-5">
                  <Button
                    color="primary"
                    size="lg"
                    className="w-full btn-blue-cta h-12 text-base justify-center"
                    startContent={<Icon icon="solar:wallet-money-bold" />}
                  >
                    立即充值
                  </Button>
                </div>
              </Card>

              {/* 计费信息模块（恢复原位置） */}
              <EditableSection page="membership" section="billing-info">
                <Card className="bg-blue-50 border border-blue-200 p-6">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 bg-blue-100 rounded-lg flex items-center justify-center">
                      <Icon icon="solar:shield-keyhole-bold-duotone" className="text-blue-600 text-sm" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-800 text-sm">想了解更多资讯吗?</h4>
                      <p className="text-xs text-gray-600">查看金融的相关计算标准和价格说明</p>
                    </div>
                    <Button color="primary" size="sm" className="text-xs px-2 py-1 h-7 ml-auto mr-0">
                      查看计费标准
                    </Button>
                  </div>
                </Card>
              </EditableSection>

            </div>
            </EditableSection>
          </div>
        </div>
      </section>
    </div>
  );
}