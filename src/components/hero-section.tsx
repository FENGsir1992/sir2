import React from "react";
import { Button, Image } from "@heroui/react";

export const HeroSection: React.FC = () => {
  return (
    <section className="w-full py-12 md:py-24 lg:py-32 bg-gradient-to-r from-content1 to-content2">
      <div className="container px-4 md:px-6 mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-center">
          <div className="flex flex-col justify-center space-y-4">
            <div className="inline-block px-3 py-1 text-sm bg-primary-100 text-primary rounded-full mb-2">
              New Collection 2024
            </div>
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tighter">
              Discover Our Latest 
              <span className="text-primary"> Eco-Friendly</span> Products
            </h1>
            <p className="text-default-600 md:text-xl max-w-[600px]">
              Sustainable products that don't compromise on style or quality. Shop our new arrivals today.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 mt-4">
              <Button color="primary" size="lg" className="font-medium">
                Shop Now
              </Button>
              <Button variant="bordered" size="lg" className="font-medium">
                Learn More
              </Button>
            </div>
          </div>
          <div className="relative">
            <div className="absolute -top-6 -left-6 w-24 h-24 bg-primary-100 rounded-full blur-xl opacity-60"></div>
            <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-secondary-100 rounded-full blur-xl opacity-60"></div>
            <Image
              removeWrapper
              alt="Hero product"
              className="w-full h-auto object-cover rounded-xl shadow-lg"
              src="https://img.heroui.chat/image/furniture?w=800&h=600&u=1"
            />
          </div>
        </div>
      </div>
    </section>
  );
};