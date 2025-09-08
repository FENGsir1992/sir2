import React from "react";
import { Button } from "@heroui/react";
import { Icon } from "@iconify/react";

export const PromoBanner: React.FC = () => {
  return (
    <section className="py-16 container mx-auto px-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* First Banner */}
        <div className="relative h-[300px] overflow-hidden rounded-lg">
          <img
            src="https://img.heroui.chat/image/fashion?w=800&h=600&u=31"
            alt="Summer Collection"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/70 to-transparent" />
          <div className="absolute top-0 left-0 p-8 md:p-10 flex flex-col h-full justify-center">
            <span className="text-white/80 text-sm mb-2">New Collection</span>
            <h3 className="text-white text-3xl font-bold mb-4">Summer Sale<br />Up to 50% Off</h3>
            <Button 
              color="primary" 
              radius="sm"
              endContent={<Icon icon="lucide:arrow-right" width={16} />}
              className="max-w-[140px]"
            >
              Shop Now
            </Button>
          </div>
        </div>

        {/* Second Banner */}
        <div className="relative h-[300px] overflow-hidden rounded-lg">
          <img
            src="https://img.heroui.chat/image/fashion?w=800&h=600&u=32"
            alt="Eco Collection"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/70 to-transparent" />
          <div className="absolute top-0 left-0 p-8 md:p-10 flex flex-col h-full justify-center">
            <span className="text-white/80 text-sm mb-2">Sustainable Products</span>
            <h3 className="text-white text-3xl font-bold mb-4">Eco-Friendly<br />Collection</h3>
            <Button 
              color="primary" 
              radius="sm"
              endContent={<Icon icon="lucide:arrow-right" width={16} />}
              className="max-w-[140px]"
            >
              Discover
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};