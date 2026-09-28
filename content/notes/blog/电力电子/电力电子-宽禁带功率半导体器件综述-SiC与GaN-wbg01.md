---
blog: true
title: "宽禁带功率半导体器件综述 Digest：SiC 与 GaN"
slug: "宽禁带功率半导体器件综述-SiC与GaN-wbg01"
summary: "一篇 WBG 功率器件综述的英文摘要：硅的物理极限为何成为瓶颈，SiC 与 GaN 两条技术路线的器件进展（SBD/JBS/JFET/MOSFET/IGBT、HEMT），以及常关型设计、高温封装等当年列出的开放问题。"
date: 2026-09-27
category: "电力电子"
featured: false
tags:
  - "宽禁带半导体"
  - "SiC"
  - "GaN"
  - "电力电子"
  - "文献综述"
---

## 1. Why silicon is no longer enough

Roughly 40% of the world's energy is consumed in electrical form, and in a typical converter the largest share of the losses ends up in the power semiconductor devices themselves. That is the problem this survey sets out from. Silicon is a mature technology, yet its physics imposes boundaries: the highest blocking voltage of a commercial Si IGBT is 6.5 kV, no one Si-based device survives above 200 °C, with switching frequency limited, which usually forces designers to pay for these bounds with heavy cooling hardware and bulky passives. WBG materials relax all three constraints at once, since they combine a higher critical electric field with tolerance to temperature and faster switching. The authors concentrate on SiC and GaN, arguing that these two offer the best compromise among theoretical performance, wafer and epilayer availability, and process maturity.

## 2. SiC power devices

Device progress in SiC has always tracked substrate quality. Micropipe density had fallen to 0.75 cm⁻² on 75-mm wafers, 100-mm material was already on the market, and 150-mm wafers were expected, so large-area chips could finally be made with acceptable yield. However, basal plane dislocations, the authors note, remained a concern for bipolar parts.

Rectifiers were the first SiC devices to reach the market, and the physics explains why. At the same drift-layer thickness, a SiC drift region blocks about ten times the voltage of a Si one, and the high thermal conductivity permits higher current densities with smaller cooling hardware. SiC SBDs have been commercial since 2001; ratings climbed from the initial 300 V/10 A and 600 V/6 A to 600 V/20 A and 1.2/1.7 kV, with currents as high as 50 A and 3.3 kV parts announced. Their reverse recovery charge is very low, so they match Si IGBTs almost ideally as freewheeling diodes, and easy paralleling led to commercial 600 A/1.2 kV IGBT modules built around them. According to the survey, SBDs were expected to displace Si p-i-n rectifiers between 600 V and 3 kV. High-temperature operation opened another niche: large-area 3.3 kV SBDs carrying 10–20 A had been fabricated, and a 300 V/5 A SBD was developed for the BepiColombo ESA space mission, although high-temperature packaging still had to be worked out.

The other two rectifier families cover what the SBD cannot do. Schottky devices switch fast and waste little in the on-state, but their blocking voltage is limited and leakage runs high; p-i-n diodes block high voltage with low leakage, at the price of reverse recovery charge. JBS diodes merge the two, conducting like a Schottky device while blocking like a p-i-n. They were sold up to 1.2 kV (Infineon's thinQ! 5G line of 650 V parts, built on a thin-wafer process with improved surge current capability and avalanche ruggedness, plus 50 A devices from Cree), and laboratory JBS spanned 75–100 A/1.2 kV up to 20 A/10 kV. True p-i-n diodes only make sense above 2–3 kV; the state of the art was a 4.5 kV device dropping 3.2 V at 180 A (100 A/cm²) with 1 μA of leakage, and 20 kV structures had been demonstrated. Yet none were on the market. Reliability problems, mainly forward-voltage drift, stood in the way, and commercialization depended on improving the starting material quality.

The first commercial SiC switch was not a MOSFET but a JFET. Its specific on-resistance is very low, it tolerates heat and fast switching, and it targets the 1.2–1.7 kV band where neither Si MOSFETs nor IGBTs are comfortable. A JFET is normally-on, though, so Infineon shipped it in cascode with a low-voltage Si MOSFET: a 1.5 kV/0.5 Ω hybrid first, then the 1.2 kV/70 mΩ CoolSiC. The price of the cascode is the loss of high-temperature capability. Normally-off trench JFETs avoided that compromise but suffered from resistive channels and low threshold voltages at the time.

SiC MOSFETs took much longer. The obstacle was the SiC/SiO₂ interface, where inversion channel mobility stayed stubbornly low. As described in Section II-B, the process community worked through it step by step: NO/N₂O post-oxidation annealing cut interface trap density near the conduction band edge, POCl₃ annealing tripled mobility relative to NO, and high-k dielectrics or alternative crystal faces pushed research devices past 200 cm²/Vs. Commercial parts followed soon after. Cree released a 1.2 kV MOSFET in 2011, Rohm offered 80 mΩ parts and trench designs, full-SiC modules reached 120 A/1.2 kV in production with 800 A prototypes reported, and a 10 kV DMOSFET had been demonstrated.

For still higher voltages the survey turns to bipolar devices. Cree holds the records here: a 15 kV p-channel IGBT and a 12.5 kV n-channel device, with 20–30 kV considered within reach once the MOSFET gate-oxide work transferred over. SiC BJTs reached 4 kV/10 A, though stacking faults degraded them under forward stress. Thyristors went furthest toward application; a 4.5 kV/120 A SiCGT ran at 400 °C and had already been proven in a 120 kW three-phase inverter.

## 3. GaN power devices

GaN developed along a different line, because cheap bulk substrates did not exist. Epilayers were grown on SiC, sapphire, or silicon instead. GaN-on-Si is the cheapest option and scales to 200 mm, and the LED industry had already matured much of the base technology, as Section III notes. Rectifier work was mostly lateral or quasi-vertical: lateral diodes on sapphire reached $9.7 kV$,  $600 V$ Schottky diodes were close to market, and JBS versions were being studied for 600 V to 3.3 kV.

The HEMT is where GaN's case rests. In the AlGaN/GaN heterojunction, the two-dimensional electron gas pairs high density with 1200–2000 $cm²/V_s$ mobility, which projects to about a 100× advantage over silicon in the $V²_{BR}/R_{ON}$ figure of merit. Reported microwave power density went from 1.1 W/mm in 1996 to 40 W/mm, and blocking voltages were approaching 10 kV. None of this came free. Current collapse and gate-drain breakdown had to be tamed with field plates and surface passivation, and on silicon substrates the blocking voltage only moved from 700 V to 2.2 kV once the substrate was locally removed. On sapphire with via-hole heat extraction, 8.3 kV was reported.

A HEMT conducts at zero gate bias, so making it normally-off became a research topic of its own. The survey covers four approaches: etching a recess under the gate, treating the gate region with fluorine-based plasma, regrowing a selective p-n junction gate, or wiring the HEMT in cascode with a Si MOSFET. Commercial HEMTs already spanned 20–600 V (EPC, MicroGaN). Lateral GaN MOSFETs and hybrid MOS-HEMTs try to keep a robust MOS gate while preserving the 2DEG channel, aiming at switches that are normally-off, show low resistance, and can block high voltages. GaN smart-power integration was just emerging at the time of writing.

## 4. Conclusion

This paper documents a field that went from laboratory curiosity to commercial product in about a decade, and in a consistent order: material quality first, unipolar devices next, bipolar high-voltage structures last. By 2014, SiC Schottky and JBS diodes were competing head-on with Si; JFETs and 1.2 kV MOSFETs were on sale, with >10 kV IGBTs on the horizon; and GaN HEMTs were shipping up to 600 V, already the default choice in the high-frequency niche. The problems the authors list as open (SiC MOS interface quality, bipolar degradation from crystal defects, the limited availability of bulk GaN substrates, normally-off GaN design, high-temperature packaging, electrothermal modeling tools) read today like an agenda for the following device generation.
