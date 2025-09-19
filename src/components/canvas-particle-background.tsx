import React, { useEffect, useRef } from 'react';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  opacity: number;
  hue: number;
  life: number;
  maxLife: number;
}

type Props = { variant?: 'fixed' | 'absolute' };

const CanvasParticleBackground: React.FC<Props> = ({ variant = 'fixed' }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const particlesRef = useRef<Particle[]>([]);
  const mouseRef = useRef({ x: 0, y: 0 });
  const timeRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 设置画布尺寸
    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // 初始化粒子
    const initParticles = () => {
      particlesRef.current = [];
      const particleCount = Math.min(150, Math.floor((canvas.width * canvas.height) / 8000));
      
      for (let i = 0; i < particleCount; i++) {
        particlesRef.current.push(createParticle());
      }
    };

    const createParticle = (): Particle => {
      const maxLife = 300 + Math.random() * 200;
      return {
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.5,
        size: Math.random() * 3 + 1,
        opacity: Math.random() * 0.8 + 0.2,
        hue: Math.random() * 60 + 200, // 蓝紫色调
        life: maxLife,
        maxLife
      };
    };

    // 鼠标跟踪
    const handleMouseMove = (e: MouseEvent) => {
      mouseRef.current.x = e.clientX;
      mouseRef.current.y = e.clientY;
    };

    window.addEventListener('mousemove', handleMouseMove);

    // 动画循环
    const animate = () => {
      timeRef.current += 0.01;
      
      // 清空画布，使用渐变背景
      const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
      const hueShift = Math.sin(timeRef.current * 0.5) * 30;
      gradient.addColorStop(0, `hsl(${240 + hueShift}, 70%, 15%)`);
      gradient.addColorStop(0.3, `hsl(${260 + hueShift}, 80%, 20%)`);
      gradient.addColorStop(0.7, `hsl(${280 + hueShift}, 75%, 25%)`);
      gradient.addColorStop(1, `hsl(${300 + hueShift}, 70%, 30%)`);
      
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // 添加噪点纹理
      ctx.globalAlpha = 0.03;
      for (let i = 0; i < 100; i++) {
        ctx.fillStyle = Math.random() > 0.5 ? '#ffffff' : '#000000';
        ctx.fillRect(
          Math.random() * canvas.width,
          Math.random() * canvas.height,
          1, 1
        );
      }
      ctx.globalAlpha = 1;

      // 更新和绘制粒子
      particlesRef.current.forEach((particle, index) => {
        // 更新粒子位置
        particle.x += particle.vx;
        particle.y += particle.vy;
        particle.life--;

        // 鼠标交互
        const dx = mouseRef.current.x - particle.x;
        const dy = mouseRef.current.y - particle.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance < 100) {
          const force = (100 - distance) / 100;
          particle.vx += (dx / distance) * force * 0.01;
          particle.vy += (dy / distance) * force * 0.01;
        }

        // 边界处理
        if (particle.x < 0 || particle.x > canvas.width) particle.vx *= -1;
        if (particle.y < 0 || particle.y > canvas.height) particle.vy *= -1;
        
        particle.x = Math.max(0, Math.min(canvas.width, particle.x));
        particle.y = Math.max(0, Math.min(canvas.height, particle.y));

        // 生命周期透明度
        const lifeRatio = particle.life / particle.maxLife;
        const currentOpacity = particle.opacity * lifeRatio;

        // 绘制粒子
        ctx.save();
        ctx.globalAlpha = currentOpacity;
        
        // 粒子光晕效果
        const glowGradient = ctx.createRadialGradient(
          particle.x, particle.y, 0,
          particle.x, particle.y, particle.size * 3
        );
        glowGradient.addColorStop(0, `hsla(${particle.hue + Math.sin(timeRef.current + index) * 20}, 80%, 70%, ${currentOpacity})`);
        glowGradient.addColorStop(0.5, `hsla(${particle.hue}, 70%, 60%, ${currentOpacity * 0.5})`);
        glowGradient.addColorStop(1, `hsla(${particle.hue}, 60%, 50%, 0)`);
        
        ctx.fillStyle = glowGradient;
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size * 3, 0, Math.PI * 2);
        ctx.fill();

        // 粒子核心
        ctx.fillStyle = `hsla(${particle.hue}, 90%, 80%, ${currentOpacity})`;
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.restore();

        // 重生粒子
        if (particle.life <= 0) {
          particlesRef.current[index] = createParticle();
        }
      });

      // 连接线效果 - 优化性能，减少计算量
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
      ctx.lineWidth = 0.5;
      
      const maxConnections = 50; // 限制连接线数量
      let connectionCount = 0;
      
      for (let i = 0; i < particlesRef.current.length && connectionCount < maxConnections; i++) {
        for (let j = i + 1; j < particlesRef.current.length && connectionCount < maxConnections; j++) {
          const p1 = particlesRef.current[i];
          const p2 = particlesRef.current[j];
          const dx = p1.x - p2.x;
          const dy = p1.y - p2.y;
          const distanceSquared = dx * dx + dy * dy; // 避免开方运算
          
          if (distanceSquared < 14400) { // 120^2 = 14400
            const distance = Math.sqrt(distanceSquared);
            const opacity = (120 - distance) / 120 * 0.3;
            ctx.globalAlpha = opacity;
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.stroke();
            connectionCount++;
          }
        }
      }
      ctx.globalAlpha = 1;

      animationRef.current = requestAnimationFrame(animate);
    };

    initParticles();
    animate();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      window.removeEventListener('mousemove', handleMouseMove);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  const positionClass = variant === 'fixed' ? 'fixed' : 'absolute';
  return (
    <canvas
      ref={canvasRef}
      className={`${positionClass} inset-0 w-full h-full pointer-events-none z-0`}
    />
  );
};

export default CanvasParticleBackground;
