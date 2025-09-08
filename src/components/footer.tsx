import React from "react";
import { Link, Input, Button } from "@heroui/react";
import { Icon } from "@iconify/react";

export const Footer: React.FC = () => {
  return (
    <footer className="bg-content3 pt-16 pb-8">
      <div className="container px-4 mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-12">
          {/* Company Info */}
          <div>
            <div className="flex items-center mb-4">
              <Icon icon="lucide:leaf" className="text-primary text-2xl mr-2" />
              <span className="font-bold text-xl">ECOMUS</span>
            </div>
            <p className="text-default-600 mb-4">
              Sustainable furniture for modern living. Quality craftsmanship that respects our planet.
            </p>
            <div className="flex gap-4">
              <Button isIconOnly variant="flat" size="sm" radius="full">
                <Icon icon="lucide:facebook" size={18} />
              </Button>
              <Button isIconOnly variant="flat" size="sm" radius="full">
                <Icon icon="lucide:instagram" size={18} />
              </Button>
              <Button isIconOnly variant="flat" size="sm" radius="full">
                <Icon icon="lucide:twitter" size={18} />
              </Button>
              <Button isIconOnly variant="flat" size="sm" radius="full">
                <Icon icon="lucide:pinterest" size={18} />
              </Button>
            </div>
          </div>
          
          {/* Quick Links */}
          <div>
            <h3 className="font-semibold text-lg mb-4">Quick Links</h3>
            <ul className="space-y-3">
              <li>
                <Link href="#" color="foreground" className="text-default-600 hover:text-primary">Home</Link>
              </li>
              <li>
                <Link href="#" color="foreground" className="text-default-600 hover:text-primary">Shop</Link>
              </li>
              <li>
                <Link href="#" color="foreground" className="text-default-600 hover:text-primary">About Us</Link>
              </li>
              <li>
                <Link href="#" color="foreground" className="text-default-600 hover:text-primary">Contact</Link>
              </li>
              <li>
                <Link href="#" color="foreground" className="text-default-600 hover:text-primary">Blog</Link>
              </li>
            </ul>
          </div>
          
          {/* Customer Service */}
          <div>
            <h3 className="font-semibold text-lg mb-4">Customer Service</h3>
            <ul className="space-y-3">
              <li>
                <Link href="#" color="foreground" className="text-default-600 hover:text-primary">My Account</Link>
              </li>
              <li>
                <Link href="#" color="foreground" className="text-default-600 hover:text-primary">Track Your Order</Link>
              </li>
              <li>
                <Link href="#" color="foreground" className="text-default-600 hover:text-primary">Shipping Policy</Link>
              </li>
              <li>
                <Link href="#" color="foreground" className="text-default-600 hover:text-primary">Returns & Exchanges</Link>
              </li>
              <li>
                <Link href="#" color="foreground" className="text-default-600 hover:text-primary">FAQs</Link>
              </li>
            </ul>
          </div>
          
          {/* Newsletter */}
          <div>
            <h3 className="font-semibold text-lg mb-4">Newsletter</h3>
            <p className="text-default-600 mb-4">
              Subscribe to our newsletter and get 10% off your first purchase.
            </p>
            <div className="flex flex-col gap-2">
              <Input
                placeholder="Your email address"
                endContent={
                  <Button color="primary" radius="full" isIconOnly className="mr-1">
                    <Icon icon="lucide:arrow-right" size={16} />
                  </Button>
                }
              />
              <p className="text-xs text-default-500">
                By subscribing, you agree to our Privacy Policy.
              </p>
            </div>
          </div>
        </div>
        
        {/* Bottom Footer */}
        <div className="pt-8 border-t border-divider flex flex-col md:flex-row justify-between items-center">
          <p className="text-default-500 text-sm mb-4 md:mb-0">
            © 2024 Ecomus. All rights reserved.
          </p>
          <div className="flex items-center gap-4">
            <Link href="#" color="foreground" className="text-default-500 text-sm">Privacy Policy</Link>
            <Link href="#" color="foreground" className="text-default-500 text-sm">Terms of Service</Link>
            <Link href="#" color="foreground" className="text-default-500 text-sm">Sitemap</Link>
          </div>
        </div>
      </div>
    </footer>
  );
};