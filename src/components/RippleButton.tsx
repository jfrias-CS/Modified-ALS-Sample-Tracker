import React from "react";
import { useNavigate } from "react-router-dom";
import "./ripplebutton.css";

export const RippleButton: React.FC<React.ComponentProps<"a"> & { to: string }> = ({ children, to, ...props }) => {
  const navigate = useNavigate();

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement, MouseEvent>) => {
    e.preventDefault();

    const button = e.currentTarget;
    const circle = document.createElement("span");
    const diameter = Math.max(button.clientWidth, button.clientHeight);
    const radius = diameter / 2;

    circle.style.width = circle.style.height = `${diameter}px`;
    circle.style.left = `${e.clientX - button.getBoundingClientRect().left - radius}px`;
    circle.style.top = `${e.clientY - button.getBoundingClientRect().top - radius}px`;
    circle.classList.add("ripple");

    const ripple = button.getElementsByClassName("ripple")[0];
    if (ripple) {
      ripple.remove();
    }

    button.appendChild(circle);

    // Delay navigation until after the ripple animation (600ms)
    setTimeout(() => {
      navigate(to);
    }, 300);
  };

  return (
    <a
      {...props}
      href={to}
      className={`button ripple-button ${props.className || ""}`}
      onClick={handleClick}
    >
      {children}
    </a>
  );
};