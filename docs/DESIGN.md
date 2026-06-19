# Design.md

## School Management Web Application — Design System & UI Guidelines

---

# 1. Design Philosophy

ระบบนี้เป็นเว็บแอปพลิเคชันสำหรับโรงเรียนที่ต้องใช้งานจริงทุกวันโดย:

* Admin
* Teachers
* Students

ดังนั้น design ต้องเน้น:

* Clarity
* Reliability
* Professionalism
* Simplicity
* Efficiency

UI ต้องช่วยให้ผู้ใช้ “ทำงานให้เสร็จเร็วที่สุด” มากกว่าการโชว์ animation หรือ visual effects

Design goal:

> Clean, formal, trustworthy, and modern school administration interface.

ห้ามออกแบบให้ดูเหมือน:

* AI generated dashboard
* SaaS startup landing page
* Crypto exchange UI
* Gaming UI

Avoid:

* Overly rounded corners
* Neon colors
* Excessive gradients
* Fancy shadows
* Glassmorphism
* Over animation

---

# 2. Design Language

Visual tone:

* Formal
* Structured
* Calm
* Professional
* Modern

Keywords:

* Institutional
* Clean
* Stable
* Minimal
* Readable

Interface feeling:

* Similar to modern university portal
* Similar to enterprise admin systems
* Suitable for both desktop and mobile

---

# 3. Color System

Primary color:
Use school brand color as primary

Default recommendation:
Primary Blue

```css
Primary-50:  #EFF6FF
Primary-100: #DBEAFE
Primary-200: #BFDBFE
Primary-300: #93C5FD
Primary-400: #60A5FA
Primary-500: #3B82F6
Primary-600: #2563EB
Primary-700: #1D4ED8
Primary-800: #1E40AF
Primary-900: #1E3A8A
```

Neutral palette:

```css
Gray-50:  #F9FAFB
Gray-100: #F3F4F6
Gray-200: #E5E7EB
Gray-300: #D1D5DB
Gray-400: #9CA3AF
Gray-500: #6B7280
Gray-600: #4B5563
Gray-700: #374151
Gray-800: #1F2937
Gray-900: #111827
```

Semantic colors:

Success:

```css
#16A34A
```

Warning:

```css
#F59E0B
```

Error:

```css
#DC2626
```

Info:

```css
#0284C7
```

Background:

```css
#F8FAFC
```

Card:

```css
#FFFFFF
```

Text Primary:

```css
#111827
```

Text Secondary:

```css
#6B7280
```

---

# 4. Typography

Font priority:

Primary:

* Inter
* Geist
* IBM Plex Sans
* Noto Sans Thai (for Thai support)

Recommended:
Inter + Noto Sans Thai

Typography rules:

Heading 1:

* 32px
* Bold
* 700

Heading 2:

* 24px
* Semibold

Heading 3:

* 20px

Body:

* 16px
* Regular

Small text:

* 14px

Caption:

* 12px

Line height:

* 1.5 minimum

Rules:

* Avoid tiny text
* High readability
* Strong hierarchy

---

# 5. Spacing System

Use 8px grid system

Spacing scale:

```css
4px
8px
12px
16px
24px
32px
48px
64px
96px
```

Rules:

* Consistent margins
* Consistent padding
* Avoid random spacing

---

# 6. Border Radius

Use minimal rounding

Recommended:

Small:

```css
8px
```

Medium:

```css
12px
```

Large:

```css
16px
```

Avoid:

* 9999px buttons
* Super rounded cards

Reason:
Need formal appearance

---

# 7. Shadow System

Minimal shadow only

Card shadow:

```css
0 1px 3px rgba(0,0,0,0.08)
```

Popup shadow:

```css
0 8px 24px rgba(0,0,0,0.12)
```

Avoid:

* Heavy floating shadows
* Soft glows

---

# 8. Layout Structure

Desktop layout:

```text
+ Sidebar
+ Top Navbar
+ Main Content
```

Sidebar:

* Fixed
* Left aligned
* Width 280px

Navbar:

* Height 72px

Main content:

* Responsive
* Max width 1600px

Structure:

```text
--------------------------------
| Sidebar | Navbar             |
|         |--------------------|
|         | Main Content       |
|         |                    |
--------------------------------
```

---

# 9. Sidebar Design

Contains:

* Logo
* School name
* Navigation items
* User section

Menu items:

Admin:

* Dashboard
* Teachers
* Students
* Classes
* Schedule
* Swap Requests
* Announcements
* Settings

Teacher:

* Dashboard
* My Schedule
* Swap Requests
* Notifications
* Profile

Student:

* Dashboard
* Schedule
* Notifications
* Profile

Active state:

* Primary background
* Left indicator bar

Hover:

* Light gray

---

# 10. Dashboard Cards

Cards must show summary information

Examples:

* Current Class
* Pending Requests
* Today's Schedule
* Notifications

Card style:

* White background
* Soft border
* Small shadow

Card padding:

```css
24px
```

---

# 11. Timetable Design

This is core UI

Timetable must be extremely readable

Grid layout:

Columns:

* Time
* Monday
* Tuesday
* Wednesday
* Thursday
* Friday

Rows:

* Period 1
* Period 2
* Period 3
* etc

Cell states:
Normal:

* White

Current period:

* Blue tint

Free period:

* Gray tint

Swapped:

* Yellow highlight

Hover:

* Soft highlight

Each cell shows:

* Subject
* Teacher
* Room

---

# 12. Swap Request Modal

Modal contents:

* Current slot
* Requested slot
* Teacher target
* Reason

Actions:

* Cancel
* Submit

Modal width:

```css
640px
```

Style:

* Clean
* Minimal
* Easy to read

---

# 13. Notification UI

Notification bell in navbar

Badge:

* Red circle
* Unread count

Notification panel:

* Dropdown or side drawer

Each notification:

* Icon
* Title
* Message
* Timestamp

Unread:

* Light blue background

Read:

* White

---

# 14. Buttons

Primary:

* Blue
* White text

Secondary:

* White
* Gray border

Danger:

* Red

Success:

* Green

Button height:

```css
40-48px
```

Padding:

```css
12px 20px
```

States:

* Hover
* Active
* Disabled
* Loading

---

# 15. Forms

Inputs:

* Label
* Input
* Validation message

Input height:

```css
44px
```

Border:

```css
1px solid gray
```

Focus:

* Blue ring

Error:

* Red border

---

# 16. Tables

Use for:

* Student list
* Teacher list
* Requests
* Logs

Table rules:

* Sticky header
* Sorting
* Pagination
* Search
* Filters

Row height:

```css
56px
```

Hover:

* Gray background

---

# 17. Mobile Responsiveness

Must support:

Desktop:

> = 1280px

Tablet:
768–1279px

Mobile:
< 768px

Mobile changes:

* Sidebar becomes drawer
* Tables become cards
* Timetable becomes scrollable

Priority:
Desktop first
Mobile compatible

Reason:
Teachers may use phones often

---

# 18. Motion Guidelines

Animation should be minimal

Allowed:

* Fade
* Slide
* Scale (small)

Duration:

```css
150ms–250ms
```

Use Framer Motion for:

* Modal
* Notification
* Drawer

Avoid:

* Bouncy animation
* Long transitions

---

# 19. Component Library

Required components:

Basic:

* Button
* Card
* Input
* Modal
* Select
* Badge
* Avatar
* Tooltip

Complex:

* DataTable
* TimetableGrid
* NotificationCenter
* Sidebar
* Navbar
* ScheduleCard
* SwapModal

---

# 20. Recommended UI Stack

Framework:

* Next.js

Styling:

* Tailwind CSS

Component Base:

* shadcn/ui

Accessible primitives:

* Radix UI

Tables:

* TanStack Table

Forms:

* React Hook Form
* Zod

Animation:

* Framer Motion

Icons:

* Lucide Icons

Charts:

* Recharts

---

# 21. UX Rules

Important rules:

1. Never overwhelm user
2. Important actions must be obvious
3. Errors must explain solution
4. Loading states always visible
5. Empty states must be designed
6. Every action gives feedback

Example:
When swap request submitted:

Show toast:
“Swap request sent successfully.”

When approved:
“Schedule updated.”

---

# 22. Final Design Goal

The final interface should feel like:

* Premium internal school system
* Fast and responsive
* Stable and trustworthy
* Easy for teachers aged 25–60
* Easy for students aged 12–18

Final product should feel production-ready, enterprise-grade, and capable of becoming the central digital platform for the entire school ecosystem.

# Prompt Update — Theme & Design Revision

กรุณาแก้ไข design system ของโปรเจกต์ทั้งหมดให้ใช้ **Purple + Yellow Theme** ซึ่งเป็นสีหลักของระบบ โดยต้องรองรับทั้ง **Light Theme** และ **Dark Theme** แบบเต็มรูปแบบ (complete theming system) และสามารถ toggle ระหว่างสองโหมดได้

---

## Updated Design Direction

ต้องการให้ UI ของระบบโรงเรียนมีภาพลักษณ์:

* Modern
* Premium
* Professional
* Academic
* Elegant
* Formal but visually warm

Mood & tone:

* ดูเป็นระบบโรงเรียนระดับพรีเมียม
* มีความน่าเชื่อถือ
* สงบตา
* ใช้งานได้นานโดยไม่ล้า

ยังคงห้าม:

* AI-looking UI
* Overly futuristic design
* Neon effects
* Excessive glassmorphism
* Over-animation

---

# Color Theme

Primary brand colors:

* Purple
* Yellow / Gold

Purple ใช้เป็น:

* Primary actions
* Navigation highlights
* Focus states
* Selected states

Yellow ใช้เป็น:

* Accent
* Important highlights
* Warnings
* Active timetable indicators
* Special notifications

---

# Light Theme

Background:

```css id="l1"
#F8F7FC
```

Surface:

```css id="l2"
#FFFFFF
```

Primary Purple:

```css id="l3"
#7C3AED
```

Primary Purple Hover:

```css id="l4"
#6D28D9
```

Secondary Purple:

```css id="l5"
#C4B5FD
```

Accent Yellow:

```css id="l6"
#FACC15
```

Accent Gold:

```css id="l7"
#EAB308
```

Text Primary:

```css id="l8"
#1F1B2D
```

Text Secondary:

```css id="l9"
#6B7280
```

Border:

```css id="l10"
#E5E7EB
```

Success:

```css id="l11"
#22C55E
```

Warning:

```css id="l12"
#F59E0B
```

Error:

```css id="l13"
#EF4444
```

---

# Dark Theme

Background:

```css id="d1"
#0F0B1A
```

Surface:

```css id="d2"
#181425
```

Card:

```css id="d3"
#221C35
```

Primary Purple:

```css id="d4"
#A78BFA
```

Secondary Purple:

```css id="d5"
#8B5CF6
```

Accent Yellow:

```css id="d6"
#FDE047
```

Gold:

```css id="d7"
#FACC15
```

Text Primary:

```css id="d8"
#F9FAFB
```

Text Secondary:

```css id="d9"
#C4C7D0
```

Border:

```css id="d10"
#312A49
```

Success:

```css id="d11"
#4ADE80
```

Warning:

```css id="d12"
#FBBF24
```

Error:

```css id="d13"
#F87171
```

---

# Theme Switching

ต้องรองรับ:

* Manual toggle
* System preference detection (`prefers-color-scheme`)
* Persist user preference via cookies/localStorage
* SSR-safe theme hydration

Recommended:

* next-themes package with Next.js

Theme toggle location:

* Navbar top-right
  หรือ
* User settings

Icons:
Light mode:
☀️

Dark mode:
🌙

Transition:
Smooth 150–250ms color transition

---

# Component Theme Behavior

## Sidebar

Light:

* White / off-white background
* Purple active item
* Yellow accent badge

Dark:

* Dark purple background
* Bright purple active state
* Gold notification badge

---

## Buttons

Primary Button:
Light:

* Purple background
* White text

Dark:

* Bright purple background
* Dark text optional

Secondary Button:
Light:

* White background + purple border

Dark:

* Dark surface + purple border

Warning Button:

* Yellow / Gold

Danger Button:

* Red

---

## Timetable Grid

Normal slot:
Theme dependent surface color

Current period:

* Purple glow / purple background tint

Swapped period:

* Yellow highlight

Free period:

* Neutral muted background

Important:
Timetable must remain readable in both themes

---

## Notifications

Unread:
Light theme:

* Soft purple background

Dark theme:

* Purple-tinted dark card

Urgent notifications:

* Yellow indicator
* Optional pulse badge

---

## Cards

Card radius:
8–16px

Light theme:

* White
* Very subtle shadow

Dark theme:

* Dark purple surface
* Soft border

Avoid:

* Heavy glow
* Excessive blur

---

# Design Inspiration

Visual inspiration should feel between:

* University administration portal
* Modern enterprise dashboard
* Premium productivity software

Keywords:

* Elegant purple
* Premium gold accents
* Clean hierarchy
* Readable spacing
* High contrast

---

# Final Theme Goal

เมื่อผู้ใช้เปิดเว็บแล้ว ความรู้สึกควรเป็น:

“This feels like a premium modern school system with strong branding, clean usability, and excellent readability in both light and dark mode.”

ระบบต้อง maintain ความเป็น:

* Professional
* Elegant
* Formal
* Comfortable for long usage
