import React from "react";
import { Button, Image } from "@heroui/react";

export const PromotionSection: React.FC = () => {
  return (
    <section className="py-16 bg-content2">
      <div className="container px-4 mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* First Promotional Banner */}
          <div className="relative overflow-hidden rounded-xl">
            <Image
              removeWrapper
              alt="Summer Collection"
              className="w-full h-[300px] object-cover"
              src="https://img.heroui.chat/image/furniture?w=600&h=300&u=201"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-black/60 to-transparent flex flex-col justify-center p-8">
              <div className="max-w-[250px]">
                <h3 className="text-white text-2xl font-bold mb-2">Summer Collection</h3>
                <p className="text-white/80 mb-4">Up to 50% off on selected outdoor furniture</p>
                <Button 
                  color="primary" 
                  variant="flat" 
                  radius="full"
                  className="font-medium"
                >
                  Shop Now
                </Button>
              </div>
            </div>
          </div>
          
          {/* Second Promotional Banner */}
          <div className="relative overflow-hidden rounded-xl">
            <Image
              removeWrapper
              alt="New Arrivals"
              className="w-full h-[300px] object-cover"
              src="https://img.heroui.chat/image/furniture?w=600&h=300&u=202"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-black/60 to-transparent flex flex-col justify-center p-8">
              <div className="max-w-[250px]">
                <h3 className="text-white text-2xl font-bold mb-2">New Arrivals</h3>
                <p className="text-white/80 mb-4">Discover our latest bedroom collection</p>
                <Button 
                  color="primary" 
                  variant="flat" 
                  radius="full"
                  className="font-medium"
                >
                  Explore
                </Button>
              </div>
            </div>
          </div>
        </div>
        
        {/* Full-width Promotional Banner */}
        <div className="mt-8 relative overflow-hidden rounded-xl">
          <Image
            removeWrapper
            alt="Special Offer"
            className="w-full h-[250px] md:h-[300px] object-cover"
            src="https://img.heroui.chat/image/furniture?w=1200&h=300&u=203"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/40 to-transparent flex flex-col justify-center p-8">
            <div className="max-w-[500px]">
              <span className="bg-primary text-white px-3 py-1 rounded-full text-sm font-medium mb-3 inline-block">Limited Time Offer</span>
              <h3 className="text-white text-3xl md:text-4xl font-bold mb-2">Get 20% Off Your First Order</h3>
              <p className="text-white/80 mb-4 text-lg">Use code WELCOME20 at checkout</p>
              <Button 
                color="primary" 
                size="lg"
                className="font-medium"
              >
                Shop Now
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};