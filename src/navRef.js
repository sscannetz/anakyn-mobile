// ══════════════════════════════════════════════════════
// navRef.js — ตัวอ้างอิง navigation + สถานะลิ้นชักเมนู (มือถือ)
//
// แยกออกมาจาก App.js เพราะ AppShell กับ Header ต้องใช้ร่วมกัน
// ถ้าเก็บไว้ใน App.js จะ import วนกลับมาหาตัวเอง
// ══════════════════════════════════════════════════════
import { createNavigationContainerRef } from '@react-navigation/native';

export const navRef = createNavigationContainerRef();

// ── ร้านเก็บสถานะเล็ก ๆ ของลิ้นชัก ──
// ใช้ subscribe แบบง่าย ๆ แทน Context เพราะมีค่าเดียวและอยู่นอกต้นไม้ของ navigator
const subs = new Set();
let openState = false;

export function setDrawer(v) {
  if (openState === v) return;
  openState = v;
  subs.forEach(fn => fn(v));
}
export const openDrawer  = () => setDrawer(true);
export const closeDrawer = () => setDrawer(false);
export const isDrawerOpen = () => openState;
export function onDrawer(fn) {
  subs.add(fn);
  return () => subs.delete(fn);
}

// ไปหน้าที่เลือกจากเมนู — อยู่หน้าเดิมอยู่แล้วไม่ต้องทำอะไร
export function goTo(name) {
  closeDrawer();
  if (!navRef.isReady()) return;
  if (navRef.getCurrentRoute()?.name === name) return;
  navRef.navigate(name);
}
