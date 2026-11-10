\# ARHLINX — MASTER DEVELOPMENT PROMPT



\## 1. PROJECT IDENTITY



Build \*\*ArhLinx\*\*, a professional Windows desktop network management application.



\*\*Tagline:\*\* Complete Network Control.



ArhLinx focuses on Wi-Fi management, internet monitoring, network configuration, security, and diagnostics.



Build a real, functional application. No fake statistics, dead buttons, or controls that pretend to work.



\## 2. SYSTEM ARCHITECTURE



Use a modular architecture:



\- \*\*Frontend:\*\* React + TypeScript.

\- \*\*Desktop Framework:\*\* Electron.

\- \*\*Backend:\*\* Node.js + TypeScript.

\- \*\*Styling:\*\* Tailwind CSS.

\- \*\*Charts:\*\* Recharts.

\- \*\*Database:\*\* SQLite.

\- \*\*System Integration:\*\* Windows APIs, PowerShell and supported networking interfaces.

\- \*\*Communication:\*\* Secure IPC between Electron frontend and backend.



Architecture layers:



1\. Presentation Layer — UI, navigation, charts and controls.

2\. Application Layer — business logic and feature coordination.

3\. Network Service Layer — Wi-Fi, DHCP, firewall, DNS and monitoring.

4\. System Integration Layer — Windows APIs and administrative operations.

5\. Data Layer — SQLite, settings, history and logs.



Keep every major feature in its own module. Avoid tightly coupled code.



\## 3. CORE MODULES



Build these modules:



1\. Dashboard

2\. Internet Speed Test

3\. Data Manager

4\. Firewall \& Security

5\. Wi-Fi Settings

6\. Advanced Wi-Fi Settings

7\. Internet Settings

8\. DHCP Manager

9\. Network Placement \& Coverage

10\. Network Monitor

11\. Application Settings



\### Key functionality



\- Real-time download/upload monitoring.

\- Ping, jitter and packet loss testing.

\- Data consumption tracking and limits.

\- Firewall rules and connection monitoring.

\- Wi-Fi scanning and connection management.

\- DNS, IPv4, IPv6 and static IP configuration.

\- Wireless adapter and channel information.

\- DHCP leases and reservations where router integration permits.

\- Signal strength and coverage analysis.

\- Network diagnostics and activity logs.



Only implement functions supported by the operating system, hardware or connected router.



\## 4. DESIGN SYSTEM



Create a premium desktop interface.



\- Deep navy and charcoal background.

\- Indigo/electric blue accents.

\- Clean typography.

\- Modern charts and network visualisations.

\- Smooth, subtle animations.

\- Collapsible sidebar.

\- Light and dark themes.

\- Consistent spacing and iconography.



The interface must feel like professional network administration software, not a generic dashboard template.



\## 5. STRICT AI DEVELOPMENT RULES



These rules are mandatory.



\*\*TOKEN MANAGEMENT\*\*

\- Minimise token usage.

\- Avoid repeating the project description.

\- Never regenerate files unnecessarily.

\- Read only files relevant to the current task.

\- Avoid unnecessary explanations.

\- Keep progress reports short.

\- Do not dump entire files when a small change is enough.

\- Reuse existing components and dependencies.

\- Do not perform unnecessary research or exploration.

\- Never expand the scope without approval.



\*\*STEP-BY-STEP DEVELOPMENT\*\*

\- Work on ONE development phase at a time.

\- Never build the entire application in one operation.

\- Never start another phase automatically.

\- Complete the current phase before proposing the next.

\- Test each phase before declaring it complete.

\- Report changed files, completed work and remaining issues briefly.

\- Wait for my explicit approval before continuing.



\*\*CODE QUALITY\*\*

\- Inspect the existing project before modifying anything.

\- Preserve working code and existing functionality.

\- Avoid unnecessary dependencies.

\- Use reusable components and modular services.

\- Handle errors properly.

\- Never use mock data as real system data.

\- Never leave unfinished placeholder functionality.

\- Do not silently overwrite important files.

\- Never claim a feature works without testing it.



\*\*SECURITY\*\*

\- Validate all IPC requests.

\- Never expose unrestricted Node.js access to the renderer.

\- Use least-privilege permissions.

\- Require confirmation for dangerous network changes.

\- Protect stored credentials and sensitive network information.

\- Log important configuration changes.



\## 6. DEVELOPMENT WORKFLOW



Follow these phases strictly:



\*\*Phase 1 — Foundation\*\*

Project inspection, architecture, folder structure, dependencies and Electron setup.



\*\*Phase 2 — UI Foundation\*\*

Design system, application shell, sidebar, navigation and dashboard layout.



\*\*Phase 3 — Wi-Fi Management\*\*

Network scanning, connection status, saved networks and signal information.



\*\*Phase 4 — Speed Test\*\*

Download, upload, ping, jitter and test history.



\*\*Phase 5 — Data Manager\*\*

Usage monitoring, statistics, limits and alerts.



\*\*Phase 6 — Firewall\*\*

Firewall status, rules, application controls and activity logs.



\*\*Phase 7 — Advanced Network Settings\*\*

DNS, IP configuration, IPv4, IPv6 and wireless adapter settings.



\*\*Phase 8 — DHCP Manager\*\*

DHCP client information and supported router-side management.



\*\*Phase 9 — Placement \& Coverage\*\*

Signal analysis, coverage mapping and placement recommendations.



\*\*Phase 10 — Network Monitor\*\*

Live traffic, connections, diagnostics and monitoring history.



\*\*Phase 11 — Integration \& Testing\*\*

Connect all modules, fix bugs, test security and optimise performance.



\## 7. EXECUTION INSTRUCTIONS



Start with \*\*Phase 1 only\*\*.



First inspect the project directory and identify existing files, tools and dependencies.



Then propose the architecture and required setup.



Do not build the dashboard or any other feature yet.



Do not proceed beyond Phase 1 without my explicit approval.



At the end of each phase, provide:



\- What was completed.

\- Files created or modified.

\- Tests performed and results.

\- Known issues.

\- The next proposed phase.



\*\*FINAL RULE: You are my development agent, not an autonomous project manager. Follow instructions precisely, conserve tokens, work incrementally, and wait for approval between phases.\*\*

