---
blog: true
title: "可编程恒流信号源装置（TI杯赛道二）权威资料调研报告"
slug: "ti-cup-track2-ccs-research-report"
summary: "面向 TI 杯赛道二『单端口可编程恒流信号源』赛题的权威资料调研报告：围绕 MSPM0G3507 主控，系统梳理恒流源拓扑、精密电流检测、闭环控制算法、波形发生、负载扰动与顺从电压、TI 官方参考设计、竞赛评审要点、电源/热设计与 PCB 数模混合布局等 10 大主题。"
date: 2026-09-06
category: "TI杯赛道二"
featured: false
tags:
  - "TI杯赛道二"
  - "恒流信号源"
  - "MSPM0G3507"
  - "电子设计竞赛"
---

# 可编程恒流信号源装置（TI杯赛道二）权威资料调研报告

> 调研日期：2026-09-06 ｜ 主控：MSPM0G3507 ｜ 条目数：10 ｜ 资料时效：经典 + 最新 ｜ 深度：详细（含型号/参数/要点）

## 目录

1. [MSPM0G3507 资源与开发生态](#item_01_mspm0g3507)
2. [恒流源拓扑选型](#item_02_topology)
3. [精密电流检测与信号调理](#item_03_current_sense)
4. [闭环控制算法](#item_04_control_algorithm)
5. [波形发生（DAC/PWM 与正弦）](#item_05_waveform_gen)
6. [负载扰动工况与顺从电压](#item_06_load_disturbance_compliance)
7. [TI 官方参考设计与精讲](#item_07_ti_reference)
8. [竞赛评审与技术报告](#item_08_competition_report)
9. [电源 / 功耗 / 热设计](#item_09_power_thermal)
10. [PCB 工艺与数模混合布局](#item_10_pcb_layout)

<a id="item_01_mspm0g3507"></a>
## 1. MSPM0G3507 资源与开发生态

### 核心结论 / 推荐方案
- MSPM0G3507 是一款面向精密模拟控制的理想主控：Arm Cortex-M0+ 内核最高 80MHz，内置 2×12 位 4MSPS SAR ADC、1×12 位 1MSPS 带缓冲 DAC、2×零漂移斩波 OPA（含最高 32× 可编程增益）、3×带 8 位基准 DAC 的高速比较器、7 通道 DMA、数学加速器 MATHACL、可配置内部基准（1.4V/2.5V）以及 7 个定时器（含高级 PWM）。其最大亮点在于 ADC/OPA/GPAMP/COMP/DAC 之间支持『可编程内部模拟互联』，单芯片即可构成恒流源的设定值产生（DAC）+误差放大（OPA）+电流采样反馈（ADC）+过流保护（COMP）闭环链路，显著减少外部元件与 PCB 面积，对评分中的『外观工艺/集成度』有利。
- 针对本项目（单端口可编程恒流源，直流+低频正弦，叠加扰动电压下的精度），推荐资源映射：1) DAC12 配合定时器触发+DMA 搬运正弦查找表，作为电流设定参考电压源，并经 OPA 缓冲后驱动外部功率级（Howland 电流源或运放+功率 MOSFET）；2) ADC12 采样采样电阻上的电压（内部可直连 OPA 输出通道），实现闭环反馈与电流计算；3) 两片 OPA 可配置为缓冲器/误差放大器或级联/差分组合；4) COMP 做窗口比较器实现过流/短路保护；5) MATHACL 加速正弦计算与控制算法中的乘累加（MAC）/除法。DAC 1MSPS、12 位的分辨率与更新率对『低频正弦』（通常 <1kHz）完全够用，直流精度瓶颈主要在基准源与采样电阻，而非 MCU 本身。
- 开发生态成熟且全部官方免费：LP-MSPM0G3507 LaunchPad 提供板载 XDS110 调试器、32.768kHz/40MHz 晶振、外部 OPA2365 缓冲及 BoosterPack 接口，便于快速原型；MSPM0 SDK 提供 DriverLib 与数百个外设例程（adc12、dac12、dac12_fifo_timer_event、opa、timer、pwm、mathacl、dma 等）；SysConfig 以图形化方式生成引脚/时钟/外设/NONMAIN 初始化代码；MSPM0 Academy 提供分步实验（含 OPA 缓冲、DAC 触发、ADC 采样）。建议以 LaunchPad 验证算法与外设互联，再将最小系统集成到自制 PCB，满足竞赛对外观工艺与可配置性的要求。
- 需注意的关键约束：DAC_OUT 为单端且仅在 PA15（通道 A1_0），使用时会占用该 ADC 通道；内部基准 1.4V/2.5V 需 VREF+/- 引脚接去耦电容且精度约 ±2.4%，对高电流精度（如 <0.5%）建议改用外部精密基准；OPA 供电等于 VCC（≤3.6V）且轨到轨输出，直接用片内 OPA 难以提供较大端口电流，必须外扩功率级；零漂移斩波 OPA 存在开关纹波，对超高精度直流需评估。整体方案可行，风险集中在功率级与基准精度而非 MCU 资源。

### 关键参数 / 指标
- 内核：Arm Cortex-M0+，最高 80MHz，带存储器保护单元（MPU）；128KB Flash（ECC）、32KB SRAM（硬件奇偶校验）
- ADC：2×12 位 4MSPS 同步采样 SAR ADC，最多 17 个外部通道；硬件均值下 250ksps 时可获 14 位有效分辨率
- DAC：1×12 位 1MSPS DAC，集成输出缓冲；4×12 位内部 FIFO；支持 DMA；DAC_OUT 内部可路由至 OPA/ADC/COMP；外部输出引脚 PA15（对应 ADC 通道 A1_0）
- OPA：2×零漂移、零交越斩波运算放大器，温漂 0.5µV/°C；集成可编程增益级最高 32×；支持缓冲/通用/PGA/级联/差分配置；OPA0、OPA1 输出可接 ADC 通道 13
- GPAMP：1×通用放大器
- 比较器：3×高速比较器（COMP），各带 8 位基准 DAC；高速模式传播延迟 32ns；两路可组成窗口比较器
- DMA：7 通道控制器，可在外设与存储器间搬运数据（如 DAC 正弦表），降低 CPU 负载
- 数学加速器 MATHACL：支持 DIV、SQRT、MAC、TRIG（正弦/余弦 SINCOS、反正切 ATAN2）、MPY32/64、SQUARE32/64、MAC、SAC
- 内部基准 VREF：可配置 1.4V 与 2.5V 内部共享基准（VREF+/- 需外接去耦电容），也支持外部基准；2.5V 模式要求 VDD≥2.7V
- 定时器/ PWM：7 个定时器，总计最多 22 路 PWM；2 个 16 位高级定时器支持死区与互补输出（最多 12 路 PWM）；1 个 32 位通用定时器；2 个 16 位通用定时器支持 STANDBY 低功耗运行并带 QEI；2 个窗口看门狗（WWDT）；RTC 带闹钟与日历
- 时钟系统：内部 SYSOSC 4–32MHz（±1.2% 精度）、PLL 最高 80MHz、内部 LFOSC 32kHz（±3%）、外部 HFXT 4–48MHz、外部 LFXT 32kHz
- 电源与 IO：供电 1.62–3.6V；最多 60 个 GPIO；2 个 5V 耐受开漏 IO；2 个 20mA 高驱动 IO
- 低功耗：RUN 101µA/MHz、SLEEP 40µA/MHz、STOP 190µA@4MHz、STANDBY 1.5µA（带 32kHz LFXT 与 RTC）、SHUTDOWN 80nA
- 封装：28 引脚 VSSOP、32 引脚 VQFN（RHB）、48 引脚 LQFP/VQFN、64 引脚 LQFP（PM）；片内模拟互联支持 ADC/OPA/GPAMP/COMP/DAC 可编程连接

### 推荐器件 / 型号
- **MSPM0G3507（量产型号，如 MSPM0G3507SRHBR，VQFN RHB 32 引脚）**  
  > 128KB Flash/32KB SRAM 满足控制算法与查找表需求；完整模拟外设（2×ADC、DAC、2×OPA、3×COMP）是单芯片恒流源闭环的核心，推荐作为自制 PCB 主控。若需更多 IO 可选 64 引脚 LQFP（PM）
- **LP-MSPM0G3507 LaunchPad 开发套件（用户指南 SLAU873）**  
  > 板载 XDS110 调试器、EnergyTrace 功耗测量、32.768kHz/40MHz 晶振、外部 OPA2365 缓冲、BoosterPack 接口与板载传感器，适合算法验证与外设互联原型，再迁移到自制最小系统
- **MSPM0 SDK（软件开发套件）**  
  > 包含 DriverLib、数百个外设例程（adc12、dac12、dac12_fifo_timer_event、opa、timer、pwm、mathacl、dma 等）与中间件（IQ-Math、CMSIS-DSP），是代码起点，支持 CCS/IAR/Keil 与 FreeRTOS/Zephyr
- **SysConfig（图形化配置工具）**  
  > 以 GUI 生成引脚复用、时钟树、外设（ADC/DAC/OPA/COMP/TIMER）、NONMAIN 等初始化代码，避免手工配置 IOMUX 出错，是 MSPM0 生态的关键效率工具
- **MSPM0 Academy（官方培训实验）**  
  > 提供分步式 OPA/DAC/ADC/DMA/Timer 实验（如『OPA 缓冲器模式 + DAC 触发』、跨阻放大 TIA 例程），可直接映射到本项目闭环结构，缩短上手时间
- **外部功率级与精密元件（建议，非 MCU 本体）**  
  > 片内 OPA/DAC 驱动能力有限，需外扩运算放+功率 MOSFET/晶体管构成 Howland 电流源或电流镜；并建议配外部精密基准（如 REF 系列）与低温漂采样电阻，以提升端口电流精度与带载能力

### 权威来源
- **MSPM0G3507 产品页（TI 官方，含特性与参数摘要）** — https://www.ti.com/product/cn/MSPM0G3507  
  > 一手特性与封装/参数概览，含 ADC/DAC/OPA/比较器/基准等关键指标
- **MSPM0G350x Mixed-Signal Microcontrollers With CAN-FD Interface 数据手册（Datasheet，SLASEX6）** — https://www.ti.com/document-viewer/MSPM0G3507/datasheet  
  > 权威电气规格：ADC/DAC/OPA/VREF/COMP 电气特性、内部模拟互联、引脚映射（DAC_OUT 在 PA15、OPA 输出接 ADC 通道 13 等）
- **MSPM0G3507 LaunchPad Development Kit 用户指南（SLAU873）** — https://focus.ti.com.cn/lit/pdf/slau873  
  > 评估板硬件框图、跳线、电源、时钟、BoosterPack 引脚与外设示例，最小系统参考
- **MSPM0-SDK 软件开収套件（TI 工具页）** — https://www.ti.com.cn/tool/cn/MSPM0-SDK  
  > DriverLib、外设例程清单（含 DAC/ADC/OPA/TIMx/MATHACL/DMA）、SysConfig、RTOS 与中间件支持说明
- **MSP Academy – OpAmp 简介实验室（含 DAC 触发 OPA 缓冲示例）** — https://dev.ti.com/tirex/explore/content/mspm0_academy_%E6%95%99%E7%A8%8B_2_00_00_00/_build_mspm0_academy_%E6%95%99%E7%A8%8B_2_00_00_00/source/msp_m0/msp_m0_opamp_training/msp_m0_opamp_chinese.html  
  > 官方分步实验，演示 DAC12 经定时器中断驱动锯齿波 + OPA 缓冲器配置，直接对应本项目『DAC→OPA→输出』链路
- **Dynamic Programmable Gain Amplifier（动态 PGA 子系统，SLAAE80）** — https://www.ti.com/document-viewer/lit/html/SLAAE80  
  > OPA PGA（增益 2–32）+ ADC 窗口比较器的官方参考设计，展示内部模拟互联与自动量程，对反馈采样有借鉴价值
- **Transimpedance Amplifier With MSPM0 Integrated Op Amp（跨阻放大 TIA，SLAAE81）** — https://www.ti.com/lit/pdf/slaae81  
  > 用片内 OPA+ADC 将电流源转电压并采样，给出 RF/CF/GBW 设计公式，与恒流源『采样电阻→电压→ADC』反馈结构高度相关
- **MSPM0 G-Series MCUs Hardware Development Guide（硬件开发指南，SLAAE76C）** — https://www.ti.com/document-viewer/lit/html/SLAAE76C/GUID-B9A03C64-0FB3-4296-91DB-C4F5597199D6  
  > OPA/DAC/COMP 设计注意点、ADC 采样时间计算、外部缓冲建议、最小系统设计要点
- **Make System Design Easy With MSPM0 Precision Analog（精密模拟应用笔记，SLAAE93）** — https://training-dev.ti.com/lit/pdf/slaae93  
  > 系统说明 ADC/比较器/DAC/OPA 内部互联与差分/级联 OPA 配置，强调免外部元件的模拟信号链构建
- **Signal Acquisition With Integrated Op Amp（片内 OPA+ADC 信号采集，SLAAEL3）** — https://www.ti.com.cn/lit/pdf/slaael3  
  > OPA 缓冲/单位增益/2×PGA 与单 ADC 通道配合的示例工程，说明 SysConfig 图形化配置模拟信号链

### 对本项目的意义
- MSPM0G3507 的资源几乎是为『模拟闭环恒流源』量身设计：DAC12 提供可配置的设定参考（直流电平或正弦查找表）、OPA 充当误差放大/缓冲、ADC12 采样采样电阻电压形成反馈、COMP 提供窗口比较器式过流保护、MATHACL 加速控制算法与正弦计算、DMA 在 DAC 生成正弦时解放 CPU。内部可编程模拟互联（ADC/OPA/COMP/DAC 直连）使单端口闭环可以以极少外部元件实现，直接支撑测试 1（不同阻值+扰动下的直流电流精度）与测试 2（指定幅值/频率低频正弦电流）。
- 对竞赛评分维度而言：①技术报告可引用 TI 官方数据手册/TRM/应用笔记佐证方案；②电流精度受益于 12 位 DAC+12 位 ADC+硬件均值（14 位有效）及可选外部精密基准；③外观工艺因高集成度（少外设、小 PCB）受益；④开发生态（LaunchPad+SDK+SysConfig+Academy）成熟，便于在答辩中展示可配置性与快速迭代能力。需注意功率级与基准精度是精度主瓶颈，应在方案中重点设计。

### 风险 / 注意点
- DAC_OUT 为单端且仅 PA15（ADC 通道 A1_0）：使用 DAC_OUT 时该 ADC 通道不能采样外部信号，需在外设分配时避开该引脚用于其他模拟输入
- 内部基准精度有限：1.4V（1.379–1.421V）、2.5V（2.462–2.538V），约 ±2.4%；2.5V 模式需 VDD≥2.7V，且 VREF+/- 必须接去耦电容。对较高电流精度（如 <0.5%）建议改用外部精密基准
- 片内 OPA 供电等于 VCC（≤3.6V）且为轨到轨输出，驱动/带载能力有限；单端口恒流源必须外扩功率级（运放+MOSFET 或 Howland 电流源），MCU 本身无法直接输出较大端口电流
- 零漂移斩波 OPA 存在开关纹波/噪声，超高精度直流场景需评估对电流稳定度的影响；GBW 设置存在『低功耗/慢响应』与『高功耗/快摆率』的折中
- DAC 仅 12 位 1MSPS 单通道：低频正弦（<1kHz）足够，但幅值/频率分辨率与无杂散动态范围受 12 位限制，可能需外部低通滤波平滑；正弦生成依赖定时器触发+DMA+查找表，须验证 SYSConfig/SDK 中 DAC12 FIFO+DMA 例程可用性
- MATHACL 的 TRIG（SINCOS）实际吞吐与延迟、在 SDK DriverLib 中的 API 成熟度需进一步在 TRM/SDK 中确认；控制算法（PID/前馈）的定点/浮点预算在 80MHz M0+ 上需评估
- ADC 12 位电流分辨率受采样电阻与基准制约；叠加扰动电压（测试 1）要求模拟前端对共模/差模干扰有足够抑制，需合理布置采样点与滤波

### 不确定项（需实验/进一步确认）
- MATHACL TRIG（正弦/余弦）在恒定更新率下生成正弦的实际最大频率与延迟——不确定，需查阅 G 系列 TRM MATHACL 章节与 SDK 例程实测
- DAC12+DMA+定时器生成低频正弦是否需要外部重构低通滤波、以及 12 位下的谐波失真是否满足评分『正弦电流』要求——不确定，需实测
- 达到具体电流精度（如 ±0.5% 或更高）所需的最低基准精度与外部精密基准选型——不确定，取决于目标指标，需在方案中做误差预算
- 片内 OPA 斩波纹波对直流电流长期稳定度的实际影响量级——不确定，需实测或查阅 TRM 噪声明细
- 自制最小系统中 OPA 外部电阻/电容与功率级的推荐拓扑（Howland vs 运放+MOSFET）及散热——不确定，需结合目标电流范围与电压确定

<a id="item_02_topology"></a>
## 2. 恒流源拓扑选型

**分类**：功率模拟

### 核心结论 / 推荐方案
- 针对本赛题（单端口输出、负载电阻变化且叠加扰动电压、需输出直流与低频正弦电流、最好双极性），首选【改进型 Howland 电流泵（Improved Howland Current Pump, IHCP），采用缓冲/增强结构】作为核心拓扑。其本质是用一个差分放大器（或集成电流输出放大器）在采样电阻 Rs 上强制一个由编程电压决定的压降，从而将负载电流锁定为 Iload = G·(Vp−Vn)/Rs 的关系，使电流只由编程量与 Rs 决定，几乎不受负载电阻 RL 与负载端叠加扰动电压的影响——这正是测试1（不同阻值+扰动电压下保持指定直流电流）最需要的“高输出阻抗、电流不随负载而变”特性。
- 横向对比：①基础 Howland 在电阻完美匹配（R1/R2=R3/R4）时理想输出阻抗为无穷大，但电阻失配会严重劣化，仅适合要求不高的场合；②运放+MOSFET 跨导级（低边/高边采样）结构最简单、效率最高（高边 MOSFET 方案实测效率 ~98.96%）、易扩展到数百 mA，但它是“反馈箝位采样电阻压降”型，若无精密反馈与高输出阻抗设计，对负载端叠加扰动电压与 RL 变化的抑制能力弱于 Howland，更适合单向、大电流、对扰动不敏感的场合；③镜像电流源（基本/Wilson/Cascode）输出阻抗高、匹配好，但它是 IC 内部偏置技术，输出为固定镜像比、顺从电压裕度小、不适合本赛题“外接可变负载+可编程双极性”的需求；④INA592 是 IHCP 的集成化实现，把精密匹配薄膜电阻与 OPA192 核心集成在一颗 3×3mm 器件内，典型 CMRR 100dB、增益误差 0.01%，几乎消除离散电阻失配误差，但增益固定为 1/2 或 2 V/V、顺从电压受有限摆幅（离轨约 220mV）约束。
- 推荐落地方案：以【增强/缓冲型 IHCP】为主拓扑。前级用精密零漂移运放（如 OPAx192/OPA2192 系列；MSPM0G3507 内部即含零漂移 OPA，可承担前级或基准缓冲），差分/电流检测级优先采用 INA592 集成方案或外配 0.1% 低温漂匹配电阻网络；当目标电流超出运放直接驱动能力（>数十 mA）时，叠加 MOSFET 功率级构成复合放大器（Composite Amplifier）扩流。因 MSPM0G3507 的 DAC 为单电源 0~3.3V 输出，要得到双极性电流需设计 ±供电（如 ±12V/±15V 模拟电源）或虚地/基准偏移结构，把 DAC 输出与基准 Vn 作差得到 (Vp−Vn)。
- 顺从电压（Compliance Voltage）是本拓扑选型的关键约束：电流源只能在“供电轨 − 运放输出摆幅 − 采样电阻压降 − 功率管饱和压降”的范围内维持恒流。负载电阻越大或叠加扰动电压越高，所需顺从电压越大。若赛题要求驱动较大 RL 或承受较大扰动电压，必须选用足够高的模拟供电与高摆幅运放，否则会退出恒流区。综合精度、抗扰、双极性与可程控性，IHCP（缓冲型）是最契合本赛题的折中方案。

### 关键参数 / 指标
- IHCP 高 Zout 是其在负载/扰动变化下保持恒流的根本，也是相对 MOSFET 跨导级的核心优势
- 电阻失配是 Howland 的主要误差源之一，集成匹配电阻方案大幅改善
- 决定直流电流精度，需精密匹配电阻+低失调运放
- 决定可驱动的最大 RL 与可承受的扰动电压幅度，是本赛题指标达成的关键
- 影响测试2 低频正弦的失真与幅值精度，需选高带宽运放并合理补偿
- 直接影响顺从电压上限
- 本赛题具体范围未给定，需按赛题要求定 Rs 与功率级
- 仅在大电流、单电源场景显著，IHCP 重点在精度而非效率
- 集成方案省空间、降失配，但增益固定

### 推荐器件 / 型号
- 高输出阻抗，负载电阻与扰动电压变化时电流保持恒定，支持双极性（拉/灌电流），最契合测试1与单端口程控需求
- 低 Vos（OPA192 约 5μV）、低温漂，保证直流电流精度；轨到轨输入/输出利于顺从电压
- 典型 CMRR 100dB、增益误差 0.01%、3×3mm VSSOP，几乎消除离散电阻失配误差；代价是增益固定 1/2 或 2 V/V、顺从电压受离轨约 220mV 约束
- 当目标电流超运放直接驱动能力（>数十 mA）时作为复合放大器功率级，低栅流减小输出误差
- 降低 Howland 增益误差与 CMRR 退化；离散方案下比单个精密电阻更关键

### 权威来源
- **AN-1515 A Comprehensive Study of the Howland Current Pump (Rev. A)** — https://www.ti.com/cn/lit/pdf/snoa474  
  > TI 应用报告，系统分析基础/改进型 Howland、输出阻抗微调（附录）、动态特性与运放选型，改进型输出电容可达约 80pF
- **CIRCUIT060044 "Improved" Howland current pump circuit / SBOA436** — https://www.ti.com/document-viewer/lit/html/sboa436  
  > TI 电路库设计目标 ±25mA，含设计步骤、增益公式 G=R2/R1=(R4+Rs)/R3 与电阻匹配注意点
- **Analysis of Improved Howland Current Pump Configurations (Rev. A) / SBOA437** — https://www.ti.com.cn/kr/lit/pdf/sboa437  
  > 对比离散基础型/缓冲型/INA592 集成/可调增益四种配置，给出 INA592 关键参数与优缺点（增益固定 1/2 或 2、CMRR 100dB、增益误差 0.01%）
- **Voltage-to-current (V-I) converter circuit with MOSFET / SBOA327** — https://ti.com/document-viewer/lit/html/sboa327  
  > 单电源低边 MOSFET V-I 转换器，Io=Vi/Rsense（例 0~100mA/0~2V，Rsense=20Ω），含 Riso/CF/RF 补偿说明
- **High-Side Voltage-to-Current (V-I) Converter / SLAU502** — https://www.ti.com/lit/ug/slau502/slau502.pdf  
  > TI Precision Design，两阶高边方案 0~100mA，顺从电压 4.5V@5V，增益误差 0.0165%，效率 98.96%，传递函数 I_LOAD=V_IN·Rs2/(Rs1·Rs3)
- **Implementation and Applications of Current Sources and Current Receivers / SBOA046** — https://focus.ti.com/lit/an/sboa046/sboa046.pdf  
  > TI 应用报告，含浮动电流源、电流镜（可作精密镜像）、顺从电压限制分析与 MOSFET 串联 pass 器件
- **Precision Current Source Formed With Bootstrapped Integrator / SNVA579** — https://www.ti.com/lit/wp/snva579/snva579.pdf  
  > 自举积分器精密电流源，输出电阻约 11MΩ，顺从电压 4.3V~34V，展示复合放大器拓扑
- **INA592 E2E 讨论：手持 nA 电流源的负载调整率分析** — https://e2e.ti.com/support/processors-group/processors/f/processors-forum/1544815/unable-to-boot-from-tftp---am335x-starter-kit  
  > 给出 INA592 摆幅离轨约 220mV、负载调整率与内部增益网络匹配的关系，验证集成 Howland 的顺从电压范围
- **Bruce Trump (TI) 关于电流源顺从电压范围的博客** — https://en.eeworld.com.cn/bbs/thread-356303-1-1.html  
  > 通俗解释 compliance voltage 概念与 MOSFET 电流沉示例（如 1.25mA 在 1.3V~30V 维持恒流），强调欧姆定律约束

### 对本项目的意义
- 拓扑直接决定能否满足评分项中的“电流精度”与“测试1在不同阻值+扰动电压下输出指定直流电流”。IHCP 的高输出阻抗使其电流几乎只由编程电压与采样电阻决定，对负载电阻跳变和负载端叠加扰动电压具有天然抑制力；而简单 MOSFET 跨导级或镜像电流源在此工况下精度与抗扰显著偏弱，因此选型结论直接影响装置能否通过测试。
- 本赛题要求“模拟闭环调控+控制算法”，MSPM0G3507 的 12-bit DAC/ADC 与零漂移 OPA 恰好构成模拟外环（DAC 设目标 → 采样电阻检流 → ADC 回读 → 算法修正）。所选 IHCP 拓扑需要的前级精密运放/基准缓冲可由 MSPM0 内部资源或少量外部器件实现，且双极性、单端口特性与“输出可配置直流/低频正弦”完全匹配，是技术报告与控制方案论证的核心依据。

### 风险 / 注意点
- 电阻失配是 Howland 的首要误差源：失配导致增益误差并劣化 CMRR，必须用 0.1% 低温漂匹配电阻网络或 INA592 集成方案，否则直流精度不达标
- 顺从电压不足：供电轨与运放摆幅限制最大可驱动 RL 与可承受扰动电压；若赛题要求大 RL 或高扰动，需提高模拟供电并选高摆幅运放，否则退出恒流区
- 稳定性与补偿：IHCP 输出电容（可达约 80pF）与寄生、感性/容性负载易引发振荡，需 Riso/CF/RF 补偿与相位裕度分析（45°~60°）
- 双极性供电：MSPM0 DAC 为单电源 0~3.3V，要双极性电流需 ±模拟电源或虚地/基准偏移结构处理 (Vp−Vn)，否则只能单向
- 采样电阻功耗与温升：大电流下 Rs 自热引起阻值漂移，需选足够功率等级与低温漂电阻，必要时散热设计
- 镜像电流源类方案不适用于本赛题外接可编程负载（仅适合 IC 偏置），误选会导致顺从电压裕度不足且无法程控

### 不确定项（需实验/进一步确认）
- TI杯赛道二具体电流范围指标（如 0~20mA / 0~100mA）不确定，影响采样电阻、功率管与顺从电压选型
- MSPM0G3507 模拟前端实际供电电压（是否另有 ±12V/±15V 功率级电源）不确定，影响顺从电压上限计算
- 测试2 正弦电流的频率上限不确定，影响对运放带宽/建立时间与失真的要求
- MSPM0G3507 内部零漂移 OPA 能否直接驱动负载或仅作前级/基准缓冲（取决于封装与驱动能力），不确定
- INA592 在国内供货与成本不确定，若采购困难需退回离散精密电阻方案

<a id="item_03_current_sense"></a>
## 3. 精密电流检测与信号调理

**分类**：检测

### 核心结论 / 推荐方案
- 采样位置选择：本项目为单端口可编程恒流信号源，电流经采样电阻形成可测电压用于闭环反馈。高边采样（shunt 串在电源与负载之间）不扰动负载地、可检测对地短路，更适合精密恒流源的稳定参考地与保护需求；低边采样共模≈0V、电路简单但会扰动负载地、且难以检测负载对地短路。综合恒流源对参考地稳定与全温精度的要求，建议采用高边采样配合专用电流检测放大器。
- 采样电阻选择：需兼顾功耗 P=I²R、压降与噪声/失调占比。建议选用低阻值金属元素四端子（Kelvin）采样电阻（如 Vishay WSL 系列 TCR≤±75ppm/℃，高精度场合可选金属箔如 Ohmite FC4L 温漂低至约5ppm/℃）。阻值应使满量程压降处于 50–100mV 量级以压低失调占比，同时进行 PCB 铜箔/散热过孔设计控制自热，并校核满电流下不超过额定电流的 2/3（散热不足时仅 1/4）。
- 放大方案：优先零漂电流检测放大器 INA240（±25µV 失调、2.5ppm/℃ 增益漂移、0.2% 增益误差、CMRR 120–132dB、−4~80V 共模、400kHz 带宽、支持双向与 PWM 抑制）；低功耗/低共模场合可用 INA190（±15µV 失调、−0.2~40V 共模）。若需更高增益与灵活性，可用零漂仪表放大器 INA333（25µV 失调、0.1µV/℃ 漂移、100dB CMRR）做差分小信号放大。MSPM0G3507 片内零漂 OPA（0.5µV/℃、内置 PGA≤32x）适合做二级缓冲/滤波/电平搬移，但其输入共模受限，不宜直接用于高边高共模采样前端。
- 基准源选择：MSPM0G3507 内置可配置 1.4V/2.5V 共享基准（VREF），但其温漂与初始精度在公开资料中未给出明确数值（标注不确定），对 12-bit ADC 的高精度测量建议外接精密基准 REF5025（2.5V，0.025% 初始精度、2.5ppm/℃ 温漂、0.5µVPP/V 闪烁噪声）同时为 ADC/DAC 及调理链路提供参考，显著提升设定值与读回值的绝对精度；若采用内置 2.5V 模式，亦可与其保持一致以简化设计。

### 关键参数 / 指标
- **采样电阻温漂（TCR）**  
  > 来源 Vishay WSL / Ohmite FC4L 数据，具体以料号手册为准
- **四端子（Kelvin）连接**  
  > TI SBAA460、INA791 数据手册
- **电流检测放大器增益误差**  
  > 各器件数据手册
- **失调电压**  
  > 零漂架构使满量程压降可低至 10mV
- **失调漂移**  
  > 零漂/斩波架构
- **增益漂移**  
  > 匹配电阻增益网络
- **共模抑制比（CMRR）**  
  > 高 CMRR 抑制共模扰动
- **共模电压范围**  
  > 高边采样需覆盖母线电压+裕量
- **噪声**  
  > 限制小电流分辨率
- **外部精密基准温漂**  
  > REF50 产品页 / Voltage Reference Selection 应用笔记
- **MSPM0G3507 片内 OPA**  
  > MSPM0G3507 产品页
- **MSPM0G3507 片内基准**  
  > 需查数据手册电气特性表

### 推荐器件 / 型号
- **Vishay WSL2512 / WSLP 系列（金属元素，四端子布局）**
- **INA240**
- **INA190**
- **INA293**
- **INA333**
- **INA826**
- **MSPM0G3507 内置零漂移 OPA×2（0.5µV/℃、PGA≤32x）**
- **REF5025（2.5V）**

### 权威来源
- **INA240 数据手册（−4V 至 80V 双向超精密电流检测放大器）** — https://ti.com/document-viewer/INA240/datasheet  
  > 零漂、±25µV 失调、0.2% 增益误差、2.5ppm/℃ 增益漂移、132dB DC CMRR 等关键参数来源
- **INA190 数据手册（低功耗零漂宽动态范围精密电流检测放大器）** — https://samip.banker@ti.com/document-viewer/INA190/datasheet  
  > ±15µV 失调、80nV/℃ 漂移、−0.2~40V 共模、500V/V 增益
- **INA293-Q1 数据手册（−4V 至 110V 超高精度电流检测放大器）** — http://ti.com/document-viewer/INA293-Q1/datasheet  
  > 160dB DC CMRR、±0.15% 增益误差、±10ppm/℃ 增益漂移、1.3MHz 带宽
- **INA333 数据手册（微功耗零漂轨到轨仪表放大器）** — https://psirt@ti.com/document-viewer/ina333/datasheet  
  > 25µV 失调、0.1µV/℃ 漂移、100dB CMRR、1.8~5.5V 供电
- **INA826 产品页（成本优化仪表放大器）** — http://ti.com/product/INA826  
  > 18nV/√Hz、120dB CMRR、200µA、3~36V 供电
- **MSPM0G3507 产品页（80MHz Arm Cortex-M0+ MCU，含 DAC/ADC/零漂OPA/可配置VREF）** — https://psirt@ti.com/product/MSPM0G3507  
  > 片内 12-bit DAC/ADC、零漂 OPA 0.5µV/℃、PGA≤32x、可配置 1.4V/2.5V 共享基准
- **REF50 产品页（低噪声极低漂移精密电压基准）** — http://psirt@ti.com/product/REF50  
  > 2.5ppm/℃ 温漂、0.025% 精度、0.5µVPP/V 闪烁噪声；附 Voltage Reference Selection and Design Tips For Data Converters 应用笔记
- **TI Precision Labs – Current Sense Amplifiers（设计考量视频）** — https://ti.com/video/6076312650001  
  > 高/低边、输入共模、电流范围、双向/单向、输出类型等设计要点
- **Precision Current Measurements on High-Voltage Power-Supply Rails（SBOA165）** — http://ti.com/document-viewer/lit/html/sboa165  
  > 高/低边采样及各放大器类型（运放/差分/仪表/电流检测放大器）对比与优劣
- **SBAA460 Shunt resistor selection for isolated current sensing（应用简报）** — https://caitlin.cockrum@ti.com/document-viewer/lit/html/sbaa460  
  > 采样电阻功率降额、自热、四端子、金属元素 vs 金属箔选型准则
- **Vishay WSL 电流检测电阻（金属元素 Power Metal Strip）** — https://vishay.com/applications/automotive/diesel_ecuandfuelinjectordrivers/electrical_waterheaterpump/current_sensing/  
  > WSL 系列 R0005~R5、1% 精度、TCR≤±75ppm/℃、低热电势、AEC-Q200

### 对本项目的意义
- 对本项目（可编程恒流信号源）的意义：闭环输出精度直接由电流反馈链路的精度决定。采样电阻温漂、放大器失调/CMRR/噪声、ADC 基准稳定性三者共同决定输出直流电流精度（测试1：不同阻值电阻+叠加扰动电压下输出指定直流电流）与正弦电流波形保真度（测试2：指定幅值/频率低频正弦电流）。采用高边采样+低失调零漂放大器+精密基准，可把全温区误差压到最小，直接利好评分中的“电流精度”项。
- 单端口恒流源在负载变化与叠加扰动电压下需保持稳定的参考地并具备对地短路检测能力，高边采样优于低边；MSPM0G3507 片内 OPA/DAC/ADC 能减少外部元件、利于“外观工艺/集成度”，但内部基准精度有限，是否外接精密基准（如 REF5025）直接关系到 DAC 设定值与 ADC 读回值的绝对精度，是方案权衡关键点。

### 风险 / 注意点
- 采样电阻自热导致温漂与阻值变化：满电流下 P=I²R，表面贴装约 90% 热量经 PCB 走线传导；需保证连续工作不超额定电流的 2/3（散热不足时仅 1/4），并依数据手册功率降额曲线校核最高端子温度。
- 失调与增益误差叠加在满量程压降上：若满量程压降仅 10–20mV，INA 失调（±25µV）占比显著；建议满量程压降 ≥50mV，或选用更低失调器件（INA190/INA333）。
- 高边采样共模电压须落在放大器共模范围内；MSPM0 片内 OPA 共模受限，不能直接用于高共模高边采样，必须采用专用电流检测放大器（INA240/INA293 等）。
- 片内 ADC 使用内置基准时绝对精度受基准温漂限制；内置 1.4V/2.5V VREF 的具体温漂与初始精度需查数据手册电气表（本项目调研未给出精确值，标注不确定），高精度场景应外接 REF50 系列基准。
- 四端子（Kelvin）连接若 PCB 布局不当（检测走线靠近功率走线、共享焊盘）会引入额外误差；集成 Kelvin 连接的电流检测放大器（INA250/INA791/INA253）可规避该风险。
- 噪声限制：放大器与基准的低频闪烁噪声限制小电流分辨率；需结合滤波与 MSPM0 ADC 硬件平均（250ksps 下有效分辨率可达 14-bit）改善信噪比。

### 不确定项（需实验/进一步确认）
- MSPM0G3507 内置 1.4V/2.5V 共享基准（VREF）的温漂（ppm/℃）与初始精度具体数值，公开资料未给出，需查数据手册电气特性表确认。
- 具体采样电阻型号的精确 TCR 与负载寿命漂移（WSL 标称 ≤±75ppm/℃，金属箔低至约 5ppm/℃，但实际依阻值/封装/厂商而异），需以所选料号数据手册为准。
- 本项目目标输出电流范围与供电电压未给定，无法直接算出最佳 Rshunt 与增益组合，需按实际指标迭代计算。
- INA 器件在极低频正弦（测试2）下的动态非线性与相位误差未专门检索，需结合带宽（如 INA240 400kHz）与压摆率（2V/µs）评估波形保真度。

<a id="item_04_control_algorithm"></a>
## 4. 闭环控制算法

**分类**：算法

### 核心结论 / 推荐方案
- 针对本装置（线性恒流源、单端口、输出可配置直流/低频正弦电流，且测试1在“不同阻值电阻+叠加扰动电压”下保持指定直流电流、测试2输出指定幅值/频率低频正弦），推荐采用【模拟内环（运放+采样电阻构成电流并联负反馈，提供 μs 级本地稳定、低纹波、无数字延迟）+ 数字外环（MCU 运行 PI/PID，采样输出电流并经 DAC/调节管设定内环参考，实现精确设定值与抗扰动）】的双闭环结构。模拟内环把功率级线性化为“近似电流源”，数字外环只需慢速修正参考量，极大简化稳定分析与整定，是恒流源/开关电源的标准方案（见 Vicor 恒流控制 AN、Microchip LED 恒流 AN、MDPI 双环量化论文）。
- 数字控制器优先采用【增量式 PI】（或按需加微分项的 PID）。线性恒流源只需消除静差，PI 已足够且对反馈噪声不敏感；增量式 PID 无全局积分累积、天然抗积分饱和、故障/模式切换时输出保持（增量为零而非突变），最契合 DAC 设定绝对电压/前级参考的硬件形态。对于正弦输出，外环给定改为正弦参考，并叠加【前馈控制】（基于负载电阻/输出电压的开环预估）以减小幅值误差与相位滞后；中高频正弦成分主要由模拟内环带宽保证，外环主要校正幅值、直流偏置与低频跟踪。
- 采样率/控制带宽建议：外环数字控制（ADC 采样 + PID 计算 + DAC 更新）频率取模拟内环带宽的约 1/10~1/20。本装置模拟内环（由 OPA 增益带宽积、功率管、采样电阻及补偿决定）估计在数十 kHz~数百 kHz 量级，外环可用数 kHz~十几 kHz；MSPM0G3507 的 ADC 达 4Msps、DAC 达 1Msps、CPU 80MHz，完全可支撑外环 ≥10kHz 的更新率。参考 MDPI 双环论文经验：内环穿越频率约 11kHz、外环 2~4kHz、相位裕度 >50°；双环量化稳定必须满足 K_iv·T < q_i/q_v < K_pv 与 K_ii·T < q_DPWM/q_i < K_pi，否则会出现极限环（LCO）与纹波扰动。
- 扰动抑制：测试1的“叠加扰动电压”属负载/电源侧扰动，先由模拟内环高速抑制；数字外环可辅以【扰动观测器（DOB）前馈】——用名义模型估计等效总扰动并经低通 Q(s) 滤波后前馈补偿，可将阶跃扰动跌落从 tens-% 降到 ~5% 量级、恢复时间缩短一个数量级（见航空学报 2025、IOPscience 2020 等）。DOB 带宽取外环带宽的 1/3~1/2 以避免放大噪声。整定顺序：先调稳模拟内环，再整定数字 PI 闭环，最后开启 DOB 前馈。对于本赛题“低频正弦”，微分项与 DOB 高通特性会放大噪声，应慎用或降低带宽。

### 关键参数 / 指标
- 应≪模拟内环带宽并满足采样定理；过低则正弦跟踪失真、扰动抑制慢；过高则 MCU 负载与量化噪声增大
- fc 由比例增益决定（ωc≈K_p·G），应显著低于内环带宽以保证级联稳定
- 应≫外环带宽（约 5–10 倍以上），确保负载/扰动本地快速稳定；具体数值取决于选型，需实测确定
- 增益裕度同时建议 >6–10dB；过小易振荡，过大则响应迟缓
- 量化步长 q 直接决定极限环(LCO)/纹波；可通过缩放 ADC/DAC 量程、差分量化电压误差（16-bit 差分模式可降 q_v 约 8.5 倍）来抑制 QIP
- 前向欧拉在高频段引入相位滞后，控制频率越高越明显，宜用 Tustin 或减小控制周期
- MSPM0G3507 为 Cortex-M0+ 无 FPU，浮点 PID 成本偏高，建议定点 Q 格式或查表，并预留裕度
- 大误差时位置式积分累积会导致超调与 windup，增量式天然免疫
- “低频”具体上限与可接受 THD 赛题未给，存在不确定；高频成分依赖模拟内环带宽

### 推荐器件 / 型号
- 线性恒流源只需消除静差，PI 足够且对噪声不敏感；增量式无全局积分累积、天然抗积分饱和、故障/切换时输出保持（增量为零），最契合 DAC 设定绝对电压的硬件形态。MSPM0G3507 32KB RAM / 80MHz 可轻松运行
- 片上零漂移 OPA + 采样电阻构成电流并联负反馈，提供 μs 级本地稳定与低纹波；数字外环慢速修正参考，简化稳定分析与整定，是恒流源/电源标准方案（Vicor AN、Microchip LED 恒流 AN 印证）
- 对指定幅值/频率正弦，外环给定设为正弦，叠加基于负载电阻/输出电压的前馈可显著降低幅值误差与相位滞后，改善测试2跟踪精度
- 用名义模型估计负载/电源叠加扰动并经低通 Q(s) 滤波后前馈抵消，可将测试1扰动跌落从 tens-% 降到 ~5%、恢复时间缩短约一个数量级（航空学报2025、IOPscience2020）。带宽取外环 1/3~1/2 避免放大噪声
- 若需更宽带宽或更高性能，可用两极点两零点补偿器；TI DCL 库提供 PID/PI/DF22/DF23 等便于整定。但 M0+ 无 FPU，浮点成本高，宜用定点 Q 格式实现

### 权威来源
- **Mixed-Signal Control Circuits Use Microcontroller for Flexibility in Implementing PID Algorithms (Analog Dialogue 38-01, 2004)** — https://www.analog.com/cn/resources/analog-dialogue/articles/mixed-signal-control-circuits-pid-algorithms.html  
  > 经典 PID 基础：P/PI/PID 各作用、稳态误差与振荡关系、MCU 通过 ADC 反馈 + DAC 驱动实现 PID 闭环，适配本项目架构
- **C2000™ Digital Controller Library User's Guide (SPRUI31, TI)** — https://e2echina.ti.com/cfs-file/__key/communityserver-discussions-components-files/56/PID_5F00_C2000_5F00_-Digital-Controller-Library-Users-Guide_2800_sprui31_2900_.pdf  
  > TI 数字控制库：PID/PI 控制器、采样率选择、分辨率损失/反馈噪声/时间延迟影响、整定方法与饱和/抗积分饱和，直接指导 MCU 上数字控制实现
- **ADC Quantization Effects in Two-Loop Digital Current Controlled DC-DC Power Converters: Analysis and Design Guidelines (Appl. Sci. 2020, 10(20), 7179)** — https://www.mdpi.com/2076-3417/10/20/7179  
  > 与本 MCU 直接对应：12-bit ADC 双环路数字电流控制，给出内外环量化稳定条件 K_iv·T<q_i/q_v<K_pv 与 K_ii·T<q_DPWM/q_i<K_pi、fc=2–4kHz/PM≈52–60°、内环 11kHz，并验证满足双条件可彻底消除极限环
- **Design of High Precision Digital AC Constant Current Source (Atlantis Press)** — https://www.atlantis-press.com/article/25890651.pdf  
  > 数字 PID（位置式/增量式）用于恒流源，给出离散化公式与电流环增量 PID 实现，验证极短时间收敛到设定值
- **A Digital Constant Current Power LED Driver (Microchip AN01138A)** — https://ww1.microchip.com/downloads/aemDocuments/documents/OTH/ApplicationNotes/ApplicationNotes/01138A.pdf  
  > PIC MCU 用 PI 控制器 @976Hz 实现恒流，含峰值保持 + 低通滤波（截止频率取采样率 1/10）设计与开关频率权衡，是 MCU 恒流控制工程实例
- **Constant Current Control for DC-DC Converters (Vicor AN)** — https://www.vicorpower.com/documents/application_notes/an_ConstantCurrent.pdf  
  > 恒流控制的误差放大器补偿、电压环稳定性、最小串联电阻与相位裕度约束，适用外环补偿设计
- **数字PID控制 (科普中国)** — https://www.kepuchina.cn/article/articleinfo?business_type=100&classify=0&ar_id=251791  
  > 位置式/增量式数字 PID 离散公式、积分与微分作用、采样周期选取原则（采样定理 T≤π/ωmax）
- **基于扰动观测补偿电流调节器的双绕组感应发电机交直流集成发电控制技术 (航空学报 2025)** — https://hkxb.buaa.edu.cn/CN/10.7527/S1000-6893.2025.31865  
  > 扰动状态观测器 + 前馈补偿提升电流环响应与抗扰，给出观测器参数设计约束，可作 DOB 前馈设计参考
- **Observer-Based Bidirectional DC-DC Converter Current Prediction Strategy (IOPscience 2020)** — https://iopscience.iop.org/article/10.1088/1742-6596/1631/1/012164  
  > 非线性扰动观测器前馈通道加入外环，提升电流快速跟随与抗扰，无需额外传感器
- **如何构造频率、占空比幅度可调的精密电流源 (ADI 中文技术文章)** — https://www.macnicacytech.com/apac/cytech/zh/technical-articles/how-construct-precision-current-source-adjustable-frequency-and-duty-cycle.html  
  > 改进 Howland 电流源、DAC 采样率与分辨率选择（如 100kHz/1% 占空比需 ≥10MHz）、运放 IB/压摆率对精度影响，辅助模拟内环与 DAC 选型
- **MSPM0G3507 产品页 (TI)** — https://www.ti.com/product/cn/MSPM0G3507  
  > 关键硬件规格：12-bit 4Msps ADC（均值后等效 14-bit@250ksps）、12-bit 1Msps DAC、零漂移 OPA（0.5µV/°C、最高 32x PGA）、80MHz Cortex-M0+、ADC/DAC/OPA/COMP 可编程模拟互连——用于确定可实现的控制更新率与模拟内环

### 对本项目的意义
- 本装置在测试1（不同阻值电阻 + 叠加扰动电压下保持指定直流电流）与测试2（指定幅值/频率低频正弦）均直接依赖闭环算法。双闭环 + 数字 PI/PID + DOB 前馈的框架恰好对应：模拟内环保证负载变化与扰动电压下的本地快速恒流，数字外环保证设定精度与正弦跟踪，DOB 抑制叠加扰动。算法框架与参数初值思路可直接支撑技术报告撰写、整定流程与答辩。
- 选【增量式 PI + 模拟内环】是 TI 杯评分（电流精度/外观工艺/答辩）中稳定性与可调性的最佳平衡；量化与双环稳定条件提示了 ADC/DAC 量程缩放与采样率选取方法，可避免极限环与振荡，提升电流精度与系统可靠性，是装置能否通过测试与答辩的关键技术点。

### 风险 / 注意点
- 离散化误差：连续 PID 用前向欧拉离散会引入相位滞后，控制频率越高越明显；宜用 Tustin 或减小控制周期
- 量化与极限环（LCO）：12-bit ADC/DAC 量化步长 q 若不满足双环稳定条件会引入量化扰动/纹波甚至振荡；需合理缩放量程并对误差/参考做差分量化（如 16-bit 差分模式降 q_v 约 8.5 倍）
- 积分饱和与 Windup：位置式 PI 在大误差时积分累积导致超调；需用增量式或抗饱和（clamping/back-calculation）
- 计算与采样延迟：数字环路延迟降低相位裕度，整定需预留；MSPM0 M0+ 无 FPU，浮点 PID 成本高，建议定点 Q 格式或查表
- 模拟内环自激：OPA + 功率管 + 采样电阻构成的模拟环若补偿不当（如大电容负载、相位裕度不足）会自激振荡；需保证最小串联电阻与合适补偿
- 正弦跟踪失真：低频正弦由外环跟踪参考，幅值/相位误差来自外环带宽与参考更新率；外环更新率不足会引入失真，高频成分需模拟内环带宽支撑
- 噪声放大：微分项与 DOB 高通特性放大反馈噪声；本赛题正弦为低频，微分项慎用，DOB 低通带宽不宜过高
- ADC/DAC 量程与精度：12-bit 在满量程小电流时分辨率不足；建议量程缩放 + 硬件均值（MCU 支持 250ksps 下 14-bit 等效）以兼顾精度与速度

### 不确定项（需实验/进一步确认）
- 模拟内环具体带宽（取决于功率管选型、OPA 增益带宽积、采样电阻与补偿，需实测确定）——不确定
- 外环最优采样率/控制频率（5/10/20kHz 哪档最优取决于模拟内环带宽）——不确定，需实测
- DOB 名义模型参数（被控对象等效增益、时间常数）需辨识，初值——不确定
- MSPM0G3507 上运行定点 PID 的实际计算延迟与可达到的最高稳定控制频率（受编译器/中断开销影响）——不确定
- 正弦输出时“低频”具体上限（数 Hz/数十 Hz）与可接受 THD——不确定
- 测试1“叠加扰动电压”的具体形式（交流/直流、幅值、频率）未知，对控制带宽要求——不确定

<a id="item_05_waveform_gen"></a>
## 5. 波形发生（DAC/PWM 与正弦）

**分类**：算法

### 核心结论 / 推荐方案
- 推荐采用「12-bit DAC 直驱 + DDS 相位累加器/LUT 查表」方案作为正弦电流设定值的主产生方式，而非 PWM+低通滤波。MSPM0G3507 片内集成 12-bit 1MSPS DAC，支持内部 4×12-bit FIFO、DMA 触发与「采样时间发生器（Sample Time Generator）」，最高可 1MSPS 自动更新；配合定时器节拍或 DMA 周期搬运正弦 LUT，即可无 CPU 干预地输出指定幅值、频率的低频正弦电压（TI 官方双 DMA 演示即以 1MSPS 输出 1kHz 正弦并用 ADC 回采做 THD 分析）。该方案分辨率固定 12-bit、建立时间约 1µs、量化噪声底约 74dB，THD 与更新率远优于 PWM 方案，最适合本赛道「电流精度/技术报告」评分。
- DDS 核心是相位累加器（N 位）+ 正弦 LUT：每个时钟周期相位寄存器加频率控制字 M，输出频率 f_out = M·f_clk / 2^N。对低频正弦，可将一个周期离散为 N_LUT 点（如 256/512 点），由定时器或采样时间发生器以 f_upd 节拍逐个查表送 DAC，则 f_out = f_upd / N_LUT；通过改 M（或改 f_upd / 点数）即可连续调频且相位连续。本 MCU 还有 TRIG 数学加速器与 7 通道 DMA，可在后台刷新 LUT 而不占主循环算力。
- PWM+低通滤波仅建议作为备选/扩展通道。其分辨率由定时器计数长度决定（f_clk = f_PWM × 2^nBits），需用高阶 RC/RLC 滤除 PWM 开关纹波；TI 资料表明配合二阶滤波在 100kHz 带宽下约 >9bit、50kHz 带宽下 >10bit 分辨率，但模拟带宽、建立时间与纹波均明显劣于专用 DAC，且滤波相位/幅值误差会直接劣化正弦电流 THD，故不推荐作为主方案。
- 正弦「电流」输出需将 DAC 电压经 V-I 变换（Howland 电流源或运放+MOSFET+采样电阻拓扑）转为单端口电流。精度与 THD 最终受「DAC 非线性 + 运放失真 + 采样电阻温漂 + 参考电压温漂」四者共同限制；12-bit DAC 量化误差本身极小，瓶颈多在采样电阻 TCR 与运放/基准温漂，应通过片内 12-bit 4MSPS ADC 闭环回采采样电压、用控制算法（PI/前馈）在线校正 DAC 设定值来抑制。

### 关键参数 / 指标
- **DAC 分辨率**
- **DAC 最高更新率**
- **DAC 满量程建立时间**
- **DAC DNL**
- **DAC INL**
- **DAC 失调/增益误差**
- **DAC 有效输出范围**
- **DDS 频率公式**
- **理论量化 SNR/THD 底**
- **PWM+二阶滤波分辨率**
- **片内零漂移斩波运放 (OPA)**
- **采样电阻 TCR（精度关键）**

### 推荐器件 / 型号
- **MSPM0G3507 片内 12-bit 1MSPS DAC + DMA + Sample Time Generator + 片内 OPA0 缓冲**  
  > 无需外置 DAC，更新率高达 1MSPS、12-bit 固定分辨率、量化噪声底约 74dB；TI 官方 SDK 例程 dac12_dma_sampletimegen / dac12_fifo_sampletimegen 与双 DMA 正弦环回演示可直接复用，闭环（DAC→V-I→采样电阻→ADC 回采）易实现
- **256~512 点 12-bit 正弦查表（Flash 常量数组）+ 32-bit 相位累加器（软件或 DMA 周期搬运）**  
  > 低频正弦对存储/算力要求低；调频只需改相位增量或更新率，相位连续；可只存 1/4 周期配合符号/镜像缩减表长
- **片内零漂移斩波 OPA + 外置功率 MOSFET/晶体管 + 低 TCR 采样电阻（金属箔，开尔文连接）**  
  > 将 DAC 设定电压转为恒流；Howland 电流源或运放+MOSFET 拓扑满足「单端口」输出；采样电阻温漂是电流精度首要瓶颈，须用金属箔低 TCR 件
- **MSPM0G3507 高级定时器 PWM + 二阶 RC/RLC 滤波**  
  > 成本低、可做额外模拟通道；但带宽/纹波/THD 劣于 DAC 直驱，仅当 DAC 通道不够或需纯模拟平滑输出时考虑

### 权威来源
- **MSPM0G350x Mixed-Signal Microcontrollers With CAN-FD Interface (Datasheet)** — https://www.ti.com/lit/ds/symlink/mspm0g3507.pdf  
  > 官方数据手册：12-bit 1MSPS DAC、7ch DMA、数学加速器、定时器/PWM、零漂移 OPA、内部 VREF(1.4/2.5V) 等片内外设与电气特性
- **Make System Design Easy With MSPM0 Precision Analog (TI app note slaae93)** — https://www.ti.com.cn/de/lit/pdf/slaae93  
  > 明确给出片内 12-bit DAC 关键属性：4×12-bit FIFO、DMA 支持、内部连接 OPA/ADC/COMP、满量程建立时间 1µs(1MSPS, <±1LSB)、集成输出缓冲带自校准
- **MSPM0 SDK Examples Guide (dac12_dma_sampletimegen 等)** — https://software-dl.ti.com/msp430/esd/MSPM0-SDK/latest/docs/english/sdk_users_guide/doc_guide/doc_guide-srcs/examples_guide.html  
  > 官方 SDK 例程：dac12_dma_sampletimegen（DMA+采样时间发生器产生正弦）、dac12_fifo_sampletimegen、dac12_fifo_timer_event，面向 LP_MSPM0G3507
- **Dual-DMA Sine Wave Loopback: From DAC Generation to ADC Capture on MSPM0G (TI 视频)** — https://www.ti.com/video/6376584414112  
  > 官方演示：12-bit DAC 以 1MSPS 经 DMA 在 PA15 输出 1kHz 正弦，同时 ADC 经 DMA 回采做 THD/波形保真分析，验证闭环信号链
- **DAC8 Function Generator Subsystem Example (TI app note slaael1)** — https://www.ti.com.cn/lit/pdf/slaael1  
  > 官方 8-bit DAC 函数发生器例：256 点正弦 LUT + 定时器触发 DMA + OPA 缓冲，40µs 更新→~98Hz，说明定时器节拍+DMA+LUT 方法学（虽为 8-bit，方法可迁移到 12-bit DAC）
- **Ask The Application Engineer—33 All About Direct Digital Synthesis (Analog Devices)** — https://www.analog.com/media/en/technical-documentation/frequently-asked-questions/vol38n3.pdf  
  > DDS 原理权威资料：相位累加器、LUT、调谐方程 f_out = M·f_clk/2^N、相位连续、无环路建立时间；并给出相位/幅度截断与 DAC 分辨率等误差来源
- **Using PWM Output as a Digital-to-Analog Converter on a TMS320F280x (TI app note spraa88)** — https://focus.ti.com/lit/an/spraa88/spraa88.pdf  
  > PWM 作 DAC 的理论与实验：二阶 RLC 滤波下 >9bit@100kHz、>10bit@50kHz；给出 PWM 频率/时钟/滤波阶数对有效分辨率与带宽的权衡
- **Implement Digital DACs Using PWMs on Low-Cost MSP430 MCUs (TI app note slaae18)** — https://www.ti.com.cn/de/lit/pdf/slaae18  
  > PWM+DAC 实战：LUT 存正弦、每 PWM 周期更新占空比、RC 滤波重建；分辨率=定时器计数长度，f_clk = f_PWM × 2^nBits，适合低成本方案
- **Getting the Most Out of a High-Resolution Timer (TI app note slay029)** — https://www.ti.com.cn/lit/pdf/slay029  
  > 有效 PWM DAC 分辨率随 PWM 频率/时钟/滤波器阶数变化的量化曲线，说明存在最佳 PWM 频率使纹波与占空比分辨率综合最优
- **Current Sense Resistor Selection Guide (Stackpole) & 金属箔采样电阻资料 (EDN/VPG)** — https://stackpole-europe.com/guide-current-sense  
  > 采样电阻 TCR 对电流精度的影响：金属箔 TCR 可低至 2~10 ppm/°C、容差 ±0.1%，厚膜 75~200 ppm/°C；100°C 温升下 50ppm/°C 即 ±0.5% 误差，推荐低 TCR+开尔文连接
- **DAC – Basics / THD 与量化误差原理** — https://test.next.gr/tutorials/analog-circuit-analysis/dac-basics-tutorial  
  > THD 与噪声来源：量化误差、DAC 非线性、时钟抖动、电源噪声；N-bit 量化 SNR≈6.02N+1.76 dB，过采样/差分/精密元件可降低失真

### 对本项目的意义
- 本条目直接决定「测试2：输出指定幅值、指定频率的低频正弦电流信号」的实现路径与可达精度，是技术报告算法章与答辩的核心论证点。采用 12-bit DAC 直驱 + DDS/LUT 可在 MCU 片内完成、无需外置 DAC，契合竞赛「主控 MSPM0G3507 + 模拟闭环 + 控制算法」的约束，并便于在报告中量化更新率、分辨率、THD 与精度预估。
- 正弦电压经 V-I 变换成为单端口电流后，其幅值/频率精度最终受 DAC 设定值与采样电阻/TIA 链路共同约束；本调研厘清了「量化误差（12-bit 已极小）→ 主要瓶颈在采样电阻 TCR 与运放/基准温漂 → 需 ADC 闭环校正」的因果链，为后续电流精度优化与评分项（电流精度/外观工艺/答辩）提供算法与器件选型依据。

### 风险 / 注意点
- MSPM0G3507 片内 12-bit DAC 的 INL/DNL 与内部 VREF（1.4/2.5V）温漂未在本检索中取得 G3507 精确值，实际电流精度可能受基准温漂限制，需实测或改用外部精密基准。
- DAC 有效输出范围 0.3V~VDD-0.3V，正弦峰峰值须在范围内否则削顶失真（THD 急剧恶化）；设定幅值时需预留顶/底裕量并做直流偏置设计。
- 片内 OPA 缓冲 GBW 仅约 0.32MHz（GPAMP），虽低速正弦无碍，但若用其直接驱动 V-I 功率级需确认压摆率/驱动能力；建议 V-I 变换用外置精密/功率运放。
- PWM+滤波方案的开关纹波与滤波器相位/幅值误差会直接劣化电流 THD，且带宽有限；若误作主方案将导致精度不达标。
- 采样电阻自热引起的 TCR 漂移是电流精度首要隐患；大电流下需计算稳态温升并选低 TCR 金属箔+开尔文连接，否则长期漂移超规格。
- 低频正弦若 LUT 点数过少或更新率过低，会引入阶梯量化与杂散；需保证每周期点数充足（如 ≥128~256 点）且 f_upd 尽量高（接近 1MSPS）以压低 THD。

### 不确定项（需实验/进一步确认）
- MSPM0G3507 专属 12-bit DAC 的 INL 精确值（检索到 G150x ±2 LSB、G3519 ±4 LSB，G3507 未明确，标注约 ±2~±4 LSB）。
- 片内共享 VREF(1.4V/2.5V) 的初始精度与温度漂移系数（影响电流满量程精度，未检索到确切 ppm/°C）。
- 12-bit DAC 经片内 OPA 缓冲后实际输出正弦的实测 THD（理论量化底 ~74dB，实际受 INL/运放限制，预估 -50~-65 dB，需实测）。
- 本装置最终正弦电流的幅值/频率精度（结合 DAC+采样电阻+闭环校正后），无实测数据，预估 ±0.5%~±1% 为工程估计。
- MSPM0G3507 高级定时器 PWM 在 80MHz 时钟下的有效 DAC 分辨率与可达低频正弦带宽（趋势参考 TMS320F280x，但 MSPM0 未检索到专门测试）。

<a id="item_06_load_disturbance_compliance"></a>
## 6. 负载扰动工况与顺从电压

**分类**：功率模拟

### 核心结论 / 推荐方案
- 测试1中“负载叠加扰动电压”的物理本质是：负载并非纯电阻，而是在 Rload 上串联了一个扰动电压源 v_dist(t)（可为直流偏置、低频正弦或开关纹波）。电流源必须在该叠加电压下仍保持 Iout 恒定，这等价于要求电流源具有极高的输出阻抗（理想为∞）：输出节点电压被动变化时 Iout 几乎不变。换句话说，扰动电压会被电流源的等效并联电阻“分流”，输出阻抗越低，电流被扰动调制的量越大，电流精度越差。
- 顺从电压（compliance voltage）是恒流源在保持设定电流不变时，其输出端允许的电压范围（有上限 Vmax 与下限 Vmin）。输出级电压裕度可表示为 Vmargin = Vsupply − |Vd| − Iout·Rload，其中 Vd 为检测/输出级压降（取样电阻压降 + 功率管饱和压降或运放输出至电源轨的距离）。当负载叠加扰动电压时，瞬时所需输出电压 = Iout·Rload + v_dist(t) + Vd，因此裕度必须覆盖扰动电压的峰值，即应满足 Vsupply − Vd − Iout·Rload_max − v_dist_peak > 安全余量（建议至少 1～2 V）。顺从严量的上限由电源电压决定，下限由功率器件最小压降决定。
- 运放/输出级的非理想特性决定扰动下的表现：输出摆幅（rail-to-rail 输出越接近电源轨，顺从范围越大）、压摆率（正弦所需 SR = Vpp·π·f，例 5Vpp@1kHz 需约 15.7 V/µs，不足则正弦畸变为三角波）、增益带宽积 GBW（闭环带宽需高于信号频率并留余量）、驱动能力，以及稳定性（容性/感性负载会与开环输出阻抗形成极点，导致相位裕度不足甚至振荡）。共模抑制比 CMRR 与电源抑制比 PSRR 决定负载侧/电源侧扰动耦合到输出电流的程度（参考 slyt768 示例：负载调整率 2 μA/V，PSRR 在 10kHz 达 −75 dB）。
- 电源与功率器件选型须锚定“最大工况余量”：按最大目标电流 Iout_max、最大负载电阻 Rload_max、扰动电压峰值 v_dist_peak 计算所需顺从电压上限 Vout_max = Iout_max·Rload_max + v_dist_peak + Vd；据此选供电电压与功率器件。同时必须核算输出级（功率管/运放）最大功耗 P ≈ (Vsupply − Vout)·Iout，该功耗在轻载高顺从电压时可能远大于负载功耗（例 slyt768 中 M1 最大功耗决定 Iout_max ≈ 0.5W/23V ≈ 21mA），需配合 TO-220/DDPAK 封装与散热器做热设计。内置可调限流与热关断的功率运放（如 OPA547/OPA548）可显著提升可靠性与工艺评分。

### 关键参数 / 指标
- 恒流源保持设定电流不变时输出端允许的电压范围，上限由 Vsupply 决定，下限由功率器件最小压降决定
- 从输出端口看入的小信号阻抗，越大电流源越好
- 输出节点电压在顺从范围内变化时 Iout 的相对/绝对变化
- 电源波动耦合到输出电流的抑制能力
- 正弦输出所需最小压摆率，公式 SR = Vpp·π·f（sloa332）
- 闭环带宽需高于信号频率并留余量；大信号受 SR 限制，小信号受 GBW 限制
- rail-to-rail 输出至轨距离越小，顺从范围越大
- 功率运放/功率管可提供的连续电流
- 直接对应“负载叠加扰动电压”的瞬态响应指标
- P ≈ (Vsupply − Vout)·Iout，轻载高顺从电压时可能远超负载功耗，需散热设计

### 推荐器件 / 型号
- **功率运算放大器 OPA547 / OPA548**  
  > 宽顺从电压范围、内置可调电流限制与热关断，适合中高电压、几十 mA～数百 mA 电流；保护特性利于可靠性与答辩工艺评分；可作改进 Howland 的输出缓冲/放大级。
- **低电压大电流运放 OPA569**  
  > 与 MSPM0G3507 同低压域（单电源 5 V）匹配，轨至轨降低顺从电压损失；适合最大电流数百 mA～2 A 的低电压方案。注意其 SR 较低，仅适合低频正弦。
- **集成差分放大器 INA592 + 缓冲器（构成改进 Howland）**  
  > 集成匹配电阻几乎消除分立电阻不匹配导致的 CMRR（分立 0.1% 电阻最差仅约 60 dB）与增益误差，直接提升电流精度（评分项）；适合精密中小电流（<25 mA）高精度场景。
- **功率 MOSFET（NMOS 低边 / PMOS 高边）作输出级扩流**  
  > 将电流能力从运放扩展到安培级并提高顺从电压上限；需核算 VDS 裕量与热设计，避免因压降不足而退出线性区导致失稳/限流。
- **供电方案（双电源 ±15 V 或 单电源 5 V + 升压）**  
  > 若需双向（拉/灌）电流及最大顺从范围，采用双电源（如 ±15 V）；若与 MSPM0 同域则单电源 5 V，并用 DC-DC 升压到所需顺从电压。电源需低纹波（PSRR 耦合）并经充分去耦。

### 权威来源
- **AN-1515 A Comprehensive Study of the Howland Current Pump (Rev. A)** — https://www.ti.com/lit/an/snoa474a/snoa474a.pdf  
  > TI 经典应用笔记，系统剖析基本/改进 Howland 电流泵、输出阻抗 Zout、动态特性与放大器选型，是恒流源拓扑的权威基础资料。
- **Analysis of Improved Howland Current Pump Configurations (Rev. A) / ZHCAB96 / SBOA437** — https://www.ti.com.cn/cn/lit/ZHCAB96  
  > TI 应用笔记，给出改进 Howland 四种配置的 Iload 公式、Vshunt（输出裕量/顺从范围）与电源电压/负载电阻的关系、运放选型注意、CMRR 与稳定性警告（驱动无功负载可能相位裕度不足）。
- **High-side current sources for industrial applications (SLYT768)** — https://www.ti.com/lit/an/slyt768/slyt768.pdf  
  > TI 文章，提供电流源性能参数定义表（顺从范围、初始精度、温度漂移、负载调整率、输出噪声、PSRR、输出阻抗、建立时间）及具体算例：VOUT_max≈20 V、负载调整率 2 μA/V、PSRR −75 dB@10kHz、Zout 588 kΩ@DC、负载阶跃 9 V 建立约 700 µs。
- **Op Amp Slew Rate (SLOA332)** — https://www.ti.com/lit/pdf/sloa332  
  > TI 应用报告，明确正弦所需压摆率公式 SR = Vpp·π·f，区分小信号带宽（GBW）与大信号压摆率限制，并说明稳定性对建立时间/观测压摆率的影响。
- **TI Precision Labs – Op Amps: Stability（容性负载与 RISO 补偿）** — https://www.ti.com/zh-tw/video/4080320453001  
  > TI 高精度实验室稳定性系列：解释输出容性负载为何引起极点/相位裕度下降，及 RISO 隔离电阻补偿法，对应本项目负载扰动下的稳定性风险。
- **OPA547 高电压、高电流运算放大器 数据表** — http://m.ti.com/product/cn/OPA547  
  > TI 产品页：8–60V、0.5 A 连续、6 V/µs、可调限流、热关断，适合中高电压恒流源输出级。
- **OPA548 高电压、大电流运算放大器 数据表** — https://www.ti.com.cn/cn/lit/ds/zhcskm1d/zhcskm1d.pdf  
  > TI 数据表：8–60V 单/±4–±30V 双，3 A 连续/5 A 峰值，10 V/µs，宽摆幅、可调限流、热关断指示器。
- **OPA569 Rail-To-Rail I/O, 2A Power Amplifier 数据表** — http://m.ti.com/product/cn/OPA569  
  > TI 产品页：2.7–5.5 V 低压、2 A 连续、R-R I/O（至轨约 150 mV@2 A）、可调限流、热保护，适合与 MSPM0 同低压域方案。
- **CIRCUIT060044 Improved Howland current pump circuit** — https://m.ti.com.cn/tool/CIRCUIT060044  
  > TI 参考电路：±15V 供电、−25 mA～+25 mA 双极性改进 Howland，附带设计文档与 OPA547/OPA548 EVM 链接。
- **E2E 中文社区：电流源电路【2】Howland 电流源电路（二）** — https://e2echina.ti.com/question_answer/analog/amplifiers/f/52/t/72041  
  > TI 工程师基于 OPA551（200 mA）、OPA188 缓冲的 Howland 设计实例，讨论高精度电阻(0.1%)、C1 限制带宽、微调反馈电阻保证精度，贴近竞赛实践。
- **顺从电压（Compliance voltage）概念** — https://baike.baidu.com/view/1963274.html  
  > 百度百科：顺从电压是恒流源在恒定电流下输出电压的范围（有上下限），由电源电压、内部元件特性与反馈机制决定，直接影响可驱动负载类型与范围。

### 对本项目的意义
- 测试1直接对应“在不同阻值电阻、叠加扰动电压的负载条件下输出指定幅值直流电流”。本条目给出的顺从电压裕度公式 Vmargin = Vsupply − |Vd| − Iout·Rload 与负载阶跃建立时间，正是评分“电流精度”的核心约束：扰动电压会瞬时抬高/压低输出节点电压，若超出顺从范围则电流跌落失稳，若输出阻抗不足或 PSRR 差则电流被扰动调制，精度直接超标。
- 在“外观工艺/答辩”维度，功率器件选型、散热与保护（限流、热关断）、稳定性分析（容性负载/相位裕度，TI Precision Labs 稳定性系列为经典考点）均体现工程素养；共模/电源抑制与负载调整率的分析也可作为技术报告的量化支撑，直接服务评分。

### 风险 / 注意点
- 扰动电压峰值若叠加在最大 Rload 工况，易突破顺从电压上限，导致电流源退出线性区、Iout 跌落（精度超标）——必须保证 Vsupply − Vd − Iout·Rload_max − v_dist_peak 留有安全余量。
- 输出级功耗 P ≈ (Vsupply − Vout)·Iout 在轻载高顺从电压时可能远大于负载功耗（slyt768 中 M1 最大 0.5 W 即限制 Iout_max），需核算散热（TO-220/DDPAK + 散热器）并避免热关断。
- 容性/感性负载会与开环输出阻抗形成极点，导致相位裕度不足甚至持续振荡（ZHCAB96 明确警告驱动无功负载需预防），改进 Howland 尤甚。
- 分立电阻不匹配使 CMRR 最差仅约 60 dB 并引入增益误差（ZHCAB96），直接影响电流精度；推荐采用 INA592 等集成匹配电阻方案或 0.1% 精密电阻。
- 压摆率/GBW 不足会使低频正弦输出畸变为三角波（SR = Vpp·π·f），OPA569 等低压大电流器件 SR 偏低，仅适合很低频率。
- 电源纹波经 PSRR 耦合到输出电流，降低低频正弦精度；需低纹波供电与充分去耦。
- 检测（取样）电阻的功耗与温漂会引入电流误差与漂移，需选用低温漂、足够功率等级的精密电阻。

### 不确定项（需实验/进一步确认）
- 本项目目标电流范围（几十 mA？数百 mA？安培级？）不确定，影响功率运放选型与顺从电压/散热计算。
- 测试1“扰动电压”的具体幅值、频率、波形（纯直流？低频正弦？幅值多少？）不确定，直接影响顺从电压裕量与带宽/压摆率需求。
- 负载电阻最大值 Rload_max 不确定，影响 Vout_max 与顺从电压上限计算。
- 单端口是否要求双向（拉/灌）电流不确定，影响是否必须采用双电源与 Howland 双极性拓扑。
- MSPM0G3507 的 DAC 输出范围及是否需外加运放/功率级不确定，影响前端调理方案与整体顺从电压预算。
- 具体评分对“建立时间/瞬态响应”是否量化要求不确定，影响稳定性补偿与带宽设计的严格程度。

<a id="item_07_ti_reference"></a>
## 7. TI 官方参考设计与精讲

**分类**：参考资源

### 核心结论 / 推荐方案
- Howland 电流泵（含 Basic 与 Improved 两种拓扑）是 TI 公认的“用单个运放正负输入端构成高输出阻抗、可双向（拉/灌）甚至输出交流电流”的经典方案。其理论核心是反馈电阻比严格匹配：R1/R2 = R3/R4，此时输出电流与输入电压成正比、传递函数增益为 1/R1（或其变体），且输出阻抗极高，使电流不随负载阻抗与输出电压变化。Basic 型适合简单应用，Improved（差分放大器在采样电阻 Rs 上建立电压）更适合精密任务。AN-1515 明确指出实践问题（Zout 有限、电阻失配、稳定性）并不像理论那样简单，必须通过微调（trim）R2/R4 把 Zout 推到最大。
- ZHCAB96 / SBOA437（Rev. A）系统对比了 4 种 Improved Howland 配置，共同目标是构建能拉/灌约 ±25 mA 的高输出阻抗电流源（配合 CIRCUIT060044 的 ±15 V 双电源、输入 ±5 V、输出 ±25 mA、Vref=0 V 指标）。关键结论：(1) 分立式设计（设计1，1 个运放 + 5 个电阻）最灵活但误差来自反馈电流 Ifeedback 与电阻失配；(2) 提高反馈电阻可提升 Zout，但换来更大热噪声与带宽/稳定性风险；(3) 0.1% 公差离散电阻的最差 CMRR 仅约 60 dB，对精密应用不够，应改用 0.01% 匹配电阻或集成式差分放大器（如 INA592，片内激光修调电阻）；(4) 驱动无功（容性/感性）负载需警惕相位裕度不足导致不稳定，原文仅讨论电阻负载。
- TI Precision Labs（运放系列）给出可直接落地的设计方法学：噪声章节教如何用“噪声增益(Noise Gain)”把运放电压噪声、电流噪声与电阻热噪声在带宽内积分换算为 RMS/峰峰值（峰峰值≈6×RMS，即 6σ）；稳定性章节（含“断开差分放大器环路测相位裕度”“容性负载”“反相端电容”等）可直接用于验证 Howland 泵环路稳定；差分放大器/仪表放大器章节强调电阻匹配——TI 单片差分放大器通过激光修调可将电阻相对精度做到 0.01%，对应最坏 CMRR 约 80 dB、平均 >100 dB，远优于离散电阻。对“可编程恒流源”而言，前级用 MCU DAC 设定电压、Howland 泵做 V/I 转换、后级用 ADC 电流检测构成模拟闭环，是 TI 多份参考设计（TIDA-01525、TIDA-010962）验证过的架构。

### 关键参数 / 指标
- CIRCUIT060044; -5 V 至 +5 V; -25 mA 至 +25 mA（双极性拉/灌）; Vs+ = +15 V，Vs- = -15 V，Vref = 0 V; 改进型 Howland 电流泵
- AN-1515 (snoa474a); Basic/Improved 两种拓扑；Zout 与电阻比匹配强相关，需微调 R2 使 Zout 最大；输出可为正/负/零及交流; R1/R2 = R3/R4; 2008-01，修订 2013-04
- ZHCAB96 / SBOA437 (Rev. A); 约 ±25 mA; 4 种（分立式 / 带缓冲器分立式 / INA592+缓冲器 / INA592+可设增益）; 0.1% 离散电阻最差 CMRR ≈ 60 dB; 仅讨论电阻负载；无功负载有不稳定风险
- TIDA-01525; 8 通道、每通道最大 200 mA; 16 位（DAC80508）; < 1.5% FSR（25°C）; 10 nA/√Hz @10 kHz；带宽限制 RMS 噪声 3.4 µA; < 120 µA; PVDD 1.75 V（满量程）; DAC80508 + OPA2376 + 电流镜
- TIDA-010962 (ATE SMU); 0 V 至 80 V 或 ±40 V（四象限）; 10 µA / 10 mA / 500 mA（多量程）; 控制与测量约 0.01%（电流 CC ±500 mA 满量程 < 30 ppm）; 上升时间 ≈ 50 µs，建立时间 ≈ 20 µs，支持 >100 µF 容性负载; 20 位强制 DAC + 18 位双通道 ADC + 精密运放(OPA2182/OPA182/INA592 等)
- TIDA-01633; ±10 V 或 4–20 mA 可配置（XTR305 工业驱动器）; 典型 < 0.1%（-40°C 至 85°C）; 支持 MCU DAC 或 PWM 输入

### 推荐器件 / 型号
- TI E2E 在 AN-1515 讨论中明确推荐：轨到轨输入/输出(RRI/O)适合输出余量有限的设计；低失调、低噪声，适合 Improved Howland 泵。低功耗可选 OPA191/OPA2191/OPA4191。
- ZHCAB96 设计3/设计4 采用；片内激光修调电阻匹配精度高（相对 0.01%），CMRR 可达 80–100 dB 以上，规避离散电阻 CMRR≈60 dB 的失配误差，显著提升电流精度。
- ZHCAB96 与 TIDA 设计均强调基准与电阻匹配是精度瓶颈；TI 单片差分放大器修调电阻优于离散方案。
- 分别提供单通道 ±25 mA、多通道 200 mA、ATE 级 0.01% 精度的完整原理图/BOM/PCB，可直接借鉴闭环架构（DAC 设定→Howland V/I→ADC 检测）。
- 提供可操作的噪声积分、相位裕度测试、电阻匹配 CMRR 量化方法，是撰写技术报告与答辩的理论支撑。

### 权威来源
- **AN-1515 A Comprehensive Study of the Howland Current Pump (Rev. A)** — https://www.ti.com/lit/an/snoa474a/snoa474a.pdf  
  > Howland 泵权威综合研究：Basic/Improved 拓扑、Zout 微调、动态、运放选型、测试与修调方法。2008-01，修订 2013-04。
- **ZHCAB96 / SBOA437(A) Analysis of Improved Howland Current Pump Configurations** — https://www.ti.com/lit/an/sboa437a/sboa437a.pdf  
  > 4 种改进型 Howland 配置对比、设计注意与运放选型、电阻失配（0.1%→CMRR≈60 dB）警告。英文 SBOA437，中文 ZHCAB96。
- **CIRCUIT060044 Improved Howland current pump circuit** — https://www.ti.com/tool/CIRCUIT060044  
  > 可直接仿真的改进型 Howland 电流泵电路：输入 ±5 V、输出 ±25 mA、±15 V 双电源、Vref=0 V，附电路设计与应用手册。
- **TIDA-01525 8-Channel, 16-Bit, 200-mA Current Output DAC Reference Design** — https://www.ti.com/lit/pdf/tidudh4  
  > 多通道可编程精密电流源：DAC80508(16位)+OPA2376+电流镜，<1.5% TUE，10 nA/√Hz 电流噪声，附完整设计指南/BOM/PCB。
- **TIDA-010962 ATE 80V Discrete Floating VI Reference Design** — https://www.ti.com/tool/TIDA-010962  
  > 四象限 SMU 级参考设计：±40 V/0–80 V，电流量程 10 µA/10 mA/500 mA，校准后 0.01% 精度，20 位 DAC+18 位 ADC 闭环，可驱动 >100 µF 容性负载。
- **TIDA-01633 Compact Programmable 4-20mA and ±10V Analog Output Reference Design** — https://www.ti.com/tool/TIDA-01633  
  > 用 XTR305 实现 ±10 V / 4–20 mA 可配置模拟输出，校准后典型 <0.1% 误差，支持 MCU DAC/PWM 编程，适合参考“可编程”架构。
- **TI Precision Labs – Op amps（噪声/稳定性/差分放大器/CMRR 等章节）** — https://training.ti.com/ti-precision-labs-op-amps  
  > 行业最全在线模拟课堂：Noise(9)、Stability(9)、Common-mode rejection、差分放大器与 PCB 布局等，提供噪声积分与相位裕度实测方法。
- **Engineer It – How to determine the ins and outs of instrumentation amps（电阻匹配/激光修调）** — https://training.ti.com/node/542982  
  > 讲解单片差分/仪表放大器电阻激光修调至 0.01% 相对精度、CMRR 达 80–100+ dB，优于离散电阻，支撑 Howland 泵精度论证。
- **E2E 论坛：AN-1515 运放选型讨论（LMC6482 / OPA192 等）** — https://e2e.ti.com/support/amplifiers/f/14/t/930919  
  > TI 工程师对 Improved Howland 泵运放选型的官方建议：RRI/O 更优，推荐 OPA192/OPA2192/OPA4192、OPA191 系列、OPA197。

### 对本项目的意义
- 本项目要求“模拟闭环调控 + 控制算法、单端口输出可配置直流/低频正弦电流”，与 Howland（尤其 Improved）电流泵“双向、可交流、高输出阻抗”的特性高度契合；AN-1515 与 ZHCAB96 直接回答了拓扑选择与精度瓶颈，是技术报告与电路设计的核心依据。
- TI Precision Labs 的噪声与稳定性方法学可支撑“电流精度”评分项（量化噪声、验证环路相位裕度防振荡）；TIDA-01525/010962 的“DAC 设定→Howland V/I→ADC 检测”闭环架构可直接映射到 MSPM0G3507（内置 DAC/ADC）主控制器，为“控制算法+模拟闭环”提供权威范本。

### 风险 / 注意点
- 电阻失配是首要精度风险：0.1% 离散电阻最差 CMRR 仅约 60 dB，会引入明显增益/电流误差；必须采用 0.01% 匹配电阻或集成式差分放大器（INA592）。
- 稳定性风险：Improved Howland 泵驱动容性/感性负载时相位裕度不足可能自激振荡；原文仅验证电阻负载，需在本项目（可能接线圈/传感器）中做稳定性仿真与实测。
- Zout 与噪声的折中：提高反馈电阻可抬升输出阻抗、减小 Ifeedback 误差，但增大热噪声并可能引入带宽与寄生电容问题，需在精度与噪声间权衡。
- 运放供电余量（输出摆幅/压摆率）与负载顺从电压(compliance)限制：±15 V 供电下实际可输出电流范围受负载电阻与运放输出能力约束，需核算顺从范围。
- 低频正弦输出时运放的 1/f 噪声与失真、DAC 更新率/分辨率会影响波形纯度与精度，需选低噪声运放并合理设定 DAC 采样率。

### 不确定项（需实验/进一步确认）
- 本竞赛对输出电流标称范围与精度等级的具体指标（如 mA 级/µA 级、允许误差%）未知，需以赛题为准——标注“不确定”。
- 目标负载类型（纯阻/感性/容性）与最大顺从电压未明确，影响运放选型与稳定性设计——标注“不确定”。
- ZHCAB96 中设计3/设计4 使用 INA592 的具体增益与缓冲器型号在不同版本(Rev./A)间是否有差异，未在本次检索中逐页核对——标注“不确定”。
- MSPM0G3507 内置 DAC/ADC 分辨率与是否能直接满足本项目精度，需查器件手册进一步确认——标注“不确定”。

<a id="item_08_competition_report"></a>
## 8. 竞赛评审与技术报告

### 核心结论 / 推荐方案
TI杯（全国大学生电子设计竞赛）采用“校为基础、一次竞赛、二级评奖”机制，赛区评审后推荐不超过实际参赛队总数约10%的优秀队参加全国评奖；评分由“实际制作（含功能指标，约100分）+ 设计报告（20分）”合成总分120分，设计报告约占16.7%，是国一/国奖评定的关键分水岭。设计报告正文严格限制A4纸8页以内、首页附300字以内中文摘要，小四号宋体、行距固定值22磅，每页上方留3cm以上空白，封面与每页不得出现校名/姓名等标识，否则取消评审资格；报告须逻辑闭环、数据真实、格式规范。

技术报告必备章节与官方评分细项高度对应，通用结构为：摘要→系统方案（方案比较与选择、方案描述）→理论分析与计算（建模、参数计算、控制/测量算法推导）→电路与程序设计（单元电路、软件流程/核心代码）→测试方案与测试结果（仪器清单、测试方法、实测数据表、误差分析）→设计报告结构及规范性。以2020年F题、2024年模拟专题赛A题等官方评分表为例，设计报告20分内部权重通常为：方案论证/比较3分、理论分析与计算（节能/稳定/效率/控制策略）若干、电路与程序设计6~7分、测试方案与结果3分、结构规范性2分。

现场测试流程为：竞赛结束→作品与报告装箱密封（巡视员骑缝签名）→赛区专家组开箱测评（每组≥3位专家独立填《测评表》并签字，原始记录需参赛学生签字认可）→推荐优秀队参加综合测评（全封闭、全国统一命题）→全国评审。近年（如2026重庆赛区）采用“赛前封闭研发+线下集中测评答辩”，评审从功能实现度、创新亮点、工程实用性当面核验。答辩/现场展示是“临门一脚”：评委平均在每个作品前停留不到5分钟，重点验证作品是否真如报告所述；需准备演示“剧本”、突出闭环控制与创新点、坦诚说明不足与改进方向，并按“方案依据—算法原理—指标完成度—特色功能”组织讲解。

误差分析与精度证明是冲奖硬核要素：须对输出电流做两点/三点线性标定（零点Offset+满量程Gain校准，消除采样电阻/运放失调/参考源误差），用标准表（≥4½位）比对给出相对误差、纹波与负载调整率；建议补充不确定度评定（A类多次采样标准偏差、B类仪器与元件误差合成），使每项性能声明均有实测数据支撑。外观工艺单独计“制作工艺/工程实用性”分，要求布局整洁、强弱电隔离、测试点方便、丝印规范、焊接可靠。

### 关键参数 / 指标
- 总分构成：实际制作约100分（功能指标）+ 设计报告20分 = 120分；设计报告权重约16.7%，但常是国一/国奖分水岭
- 赛区推荐全国评奖比例：不超过本赛区实际参赛队总数约10%（各赛区细则略有差异，标注“不确定”具体上限时以当年赛区通知为准）
- 设计报告格式硬约束：正文A4纸≤8页；首页附≤300字中文摘要；小四号宋体、行距固定值22磅；每页上方留≥3cm空白（不得有文字）；封面及每页不得出现校名/姓名等标识，否则取消评审资格
- 设计报告20分内部通用权重（以官方赛题评分表为基准）：方案比较与选择/方案描述约3分；理论分析与计算（含控制策略、提高效率/稳定性方法）若干；电路与程序设计6~7分；测试方案与测试结果约3分；设计报告结构及规范性约2分
- 现场测评组织：每组至少3位专家，独立填写《测评表》，原始测试记录须完备并由参赛学生签字认可、专家签字，否则测评表无效
- 综合测评：对赛区推荐上报全国的优秀参赛队全体队员，以队为单位全封闭进行，题目与标准由全国专家组统一制定，成绩计入全国评审总分
- 恒流源类历史精度常见指标（2005/2011年赛题参考，非本项目赛题承诺值，标注“不确定”）：基本要求输出电流偏差绝对值≤给定值的1%+10mA；发挥部分≤0.1%+1mA（或0.1%+3个字）；纹波电流≤2mA；负载调整率（改变负载输出电压在10V内变化时）输出电流变化≤0.1%~1%
- 标定与误差方法：两点法（0V/零点+满量程）校正Offset与Gain；三点或分段多点拟合应对非线性；建议给出相对误差、纹波、负载调整率与不确定度
- 外观工艺评分点：布局整洁、强弱电安全隔离、便于测试（设置测试点、测试中不重新接线）、丝印规范、焊接可靠、人机交互清晰
- 答辩时长参考（其他杯赛可类比）：讲解10分钟+专家提问5分钟较常见；电赛现场测评中作品演示一般控制在10分钟内，需提前演练并备录播视频防现场故障

### 推荐器件 / 型号
- **全国大学生电子设计竞赛培训网（nuedc-training.com.cn）**  
  > 发布各年度TI杯赛题、评分标准、实施过程说明、培训视频（含测量与信号类、仪器仪表类、电源类赛题解析），是获取官方评分结构与赛题的最权威来源，应作为首要参考资料
- **《高精度数控恒流源—2005年全国大学生电子设计竞赛论文》（山东大学/孔峰等，人人文库/道客巴巴可查）**  
  > 与本项目“可编程恒流源”高度同源：采用负反馈恒流+高精度12位A/D（AD1674）+12位D/A（DAC1230）闭环，实测精度优于0.1mA、纹波<60μA，可直接借鉴其系统方案、理论计算与测试数据写法
- **《数控直流电流源设计与总结报告》（2005题F，百度文库/道客巴巴）**  
  > 给出完整章节模板（方案论证与比较、恒流源电路、单片机控制、效率研究、测试与误差分析），以及IRF/运放压控恒流典型电路与康铜丝采样电阻选型，适合对标本项目“模拟闭环+控制算法”章节组织
- **《电赛国一设计报告最看重哪些硬核要素？》（CSDN文库）**  
  > 总结国一报告六模块（问题分析、方案论证、理论推导、软硬件实现、系统测试、总结反思），强调方案比选量化对比、关键电路/算法原理、表格化实测数据与误差溯源，对“冲奖”写作方向价值高
- **《电子设计竞赛技术报告格式》（CSDN博客 linlingpeng_）**  
  > 给出官方常用的六段式正文模板（引言、系统方案、理论分析与设计、电路与程序设计、测试方案与结果、设计总结），含方案论证表、测试记录表、误差分析写法，可直接套用
- **《控制题电赛报告的完整书写要求》（CSDN博客 qq_51688022）**  
  > 明确摘要≤300字、一级/二级标题规范、电路图黑白清晰、图表编号、Visio绘制框图等格式细节，并强调“第一天写完报告一稿、指标按达成书写”等实战策略
- **TI Analog Engineer's Circuit — ADC增益/失调误差与两点校准（ti.com.cn/lit/pdf/sbaa239）**  
  > 官方给出两点校准（2-point calibration）消除系统Offset/Gain误差的方法与增益误差漂移计算，适合本项目做ADC采样标定与不确定度的理论依据
- **《2025电赛避坑指南》《嵌入式竞赛晋级秘籍》等经验帖（tsight.io / CSDN）**  
  > 总结答辩演示剧本、评委必问题（电源方案、信号完整性、降额设计、实时性、异常处理）、外观工艺与备份方案，对现场展示与防坑有较高参考价值

### 权威来源
- **全国大学生电子设计竞赛培训网（官方：赛题/评分标准/实施说明/培训）** — https://www.nuedc-training.com.cn/  
  > 竞赛官方平台，集中发布TI杯各年度赛题、评分标准、实施过程说明与赛题解析培训视频，是评分结构与技术报告要求的最高权威来源
- **2023年TI杯全国大学生电子设计竞赛上海赛区实施过程说明（含设计报告写作与装订要求、测评流程）** — https://nuedc-sh.sjtu.edu.cn/post_detail.php?id=15  
  > 官方赛区文件，明确设计报告≤8页、摘要≤300字、小四宋体22磅行距、每页上方留3cm空白、封面不得出现校名姓名；并说明作品密封、开箱测评（每组≥3专家独立填测评表）、综合测评等完整流程
- **关于2024年全国大学生电子设计竞赛信息科技前沿专题赛决赛评审工作安排的通知** — https://www.nuedc-training.com.cn/index/news/details/new_id/326  
  > 官方评审安排，明确决赛评审含作品实物功能演示、测试、参赛作品介绍（可用PPT）及提问，每队评审原则上≤30分钟，演示与介绍各≤10分钟，是现场答辩流程的直接依据
- **2020年TI杯大学生电子设计竞赛 简易无接触温度测量与身份识别装置（F题）评分标准** — https://www.nuedc-training.com.cn/index/news/details/new_id/227  
  > 官方赛题附评分表，设计报告20分拆为系统方案3、设计与论证5、电路及程序设计7、测量方案与结果3、结构规范性2，印证设计报告内部通用权重结构
- **2026年全国大学生电子设计竞赛赛区赛暨模拟电子系统设计专题赛（TI杯）初赛赛题（含A题AC-AC变换电路评分表）** — https://www.nuedc-training.com.cn/  
  > 官方专题赛赛题，其评分表给出设计报告20分细项（方案论证3、理论分析与计算、电路与程序设计、测试方案与结果3、结构规范性2），且专题赛性质（模拟电子系统）与本项目恒流信号源高度相关
- **TI杯2025年全国大学生电子设计竞赛（北京赛区）竞赛方案** — https://jw.beijing.gov.cn/gjc/tzgg_15688/202503/t20250311_4031112.html  
  > 官方赛区方案，说明竞赛“理论设计+实际制作”、作品封存、评审测试现场不得带PC/开发装置，以及集中测评与综合测评时间节点，辅助理解评审总体安排
- **电子设计竞赛技术报告格式（CSDN博客 linlingpeng_）** — https://blog.csdn.net/linlingpeng_/article/details/8884434  
  > 经验性但贴近官方的六段式报告模板（引言、系统方案、理论分析与设计、电路与程序设计、测试方案与结果、设计总结），含方案比较表与误差分析写法
- **电赛国一设计报告最看重哪些硬核要素？（CSDN文库）** — https://wenku.csdn.net/answer/c34pwmidg6n0  
  > 评委/获奖经验归纳，强调逻辑严密、数据可信、创新辨识、格式专业，以及方案比选量化、关键电路算法原理、表格化实测与误差溯源
- **高精度数控恒流源—2005年全国大学生电子设计竞赛论文（往届获奖范例）** — https://m.renrendoc.com/p-84820920.html  
  > 与本项目同类的恒流源获奖报告，给出负反馈恒流+12位A/D与D/A闭环、精度优于0.1mA、纹波<60μA的实测写法，可借鉴章节组织与测试数据呈现
- **TI Analog Engineer's Circuit：降低RC滤波对AFE增益/漂移误差影响（含两点校准）** — https://www.ti.com.cn/de/lit/pdf/sbaa239  
  > TI官方技术文档，给出两点校准消除系统Offset/Gain误差及增益误差漂移计算方法，作为本项目ADC标定与不确定度评定的理论支撑
- **2025电赛避坑指南：评分重点与答辩技巧（TrueSight）** — https://tsight.io/articles/7894876  
  > 经验帖，归纳评分重点（方案设计、系统性能、制作工艺、文档、答辩）与答辩注意事项（熟悉设计、清晰表达、突出亮点、提前演练），对现场展示有参考性

### 对本项目的意义
本项目为TI杯赛道二“可编程恒流信号源装置”（主控MSPM0G3507，模拟闭环调控+控制算法，单端口输出可配置直流/低频正弦电流），评分结合技术报告、电流输出精度、外观工艺与现场答辩综合评定，本条目直接决定报告写作清单与答辩备赛策略，是把硬件/算法成果转化为分数的关键环节。官方设计报告的章节结构（系统方案、理论分析与计算、电路与程序设计、测试方案与数据、误差分析）与本项目必须呈现的“闭环恒流原理、PID/数字校准算法、采样电阻与运放选型、正弦DA输出、精度标定”一一对应，可作为报告目录骨架。

同时，2026年模拟电子系统设计专题赛（TI杯）的命题性质（模拟电子系统、强调理论设计与实际制作）与本项目高度契合，其评分表中“设计报告20分+实际制作100分”的权重与“效率/稳定性/控制策略”等理论分析要求，提示本项目应在报告中突出恒流源效率、负载调整率、温漂抑制与两点/三点标定带来的精度提升，并以实测数据（相对误差、纹波、THD/失真）支撑，方能在精度分与报告分双线得分。

### 风险 / 注意点
- 格式违规直接取消评审资格：封面/每页出现校名或姓名、正文超8页、未留3cm页眉空白、摘要超300字等任一违规都可能导致整队出局，须最严格自查
- 报告与实物脱节：评委提问旨在验证作品是否真如报告所述，若报告宣称指标而现场实测不达标，或被问及电源方案/信号完整性/降额/实时性细节答不出，将严重失分
- 仅做两点标定不够：恒流源存在采样电阻温漂、运放失调、DAC非线性，单点/两点校准可能残留非线性误差，未做多点拟合或不确定度评定时精度声明说服力不足
- 测试记录不规范：未列仪器清单、未让专家签字、数据表缺失或曲线非实测（如示波器截图），会被判数据不可信，误差分析项失分
- 外观工艺被低估：布局杂乱、强弱电未隔离、测试点不便、丝印遮挡MCU型号（部分赛题要求TI MCU裸露可查）、焊接虚焊，会在“制作工艺/工程实用性”扣分且影响测评安全
- 答辩超时或演示翻车：现场演示≤10分钟，设备故障无备用方案（录播视频/备用机）将直接损失展示分；讲解平铺直叙、未突出闭环控制与创新点易被忽略
- 综合测评风险：推荐全国评奖队须参加全封闭综合测评（全国统一命题），若只重主赛题而忽视综测训练，可能丢失全国评审总分中的综测分

### 不确定项（需实验/进一步确认）
- 本项目对应的2026年TI杯具体赛题评分细项与精度指标（因赛道二最终赛题未在检索中确认，恒流源精度阈值标注“不确定”，应以当年下发《测评表》为准）
- 赛区推荐全国评奖的确切比例上限（公开资料称“不超过实际参赛队约10%”，但各赛区当年细则可能不同，标注“不确定”）
- 设计报告内“理论分析与计算”项的具体分值（不同赛题在3~8分间浮动，标注“不确定”，以当年赛题评分表为准）
- 现场答辩是否强制使用PPT及具体讲解/提问时长（电赛主赛道以实物演示+提问为主，其他专题赛有10+5分钟惯例，本项目赛制标注“不确定”）
- 外观工艺是否单独列项计分及其权重（经验提及“制作工艺”分，但官方主赛道评分多并入功能/工程实用性，标注“不确定”）
- MSPM0G3507在赛道二是否为指定/建议使用器件及是否要求芯片裸露可查（部分专题赛有TI MCU裸露要求，本项目标注“不确定”，需查当年指定器件通知）

<a id="item_09_power_thermal"></a>
## 9. 电源 / 功耗 / 热设计

### 核心结论 / 推荐方案
- 推荐电源树采用“单输入→高效开关→低噪LDO二级稳压”的分级架构：外部直流（如12V适配器或电池）先经降压型开关电源给数字域3.3V（数字部分对纹波容忍度较高，可直接buck或buck+小LDO）；模拟域分成两路——一路用inverting buck-boost（如TPS62933/TPS560430）由正轨反相生成负轨（如+12V→−12V），另一路对敏感模拟（ADC、DAC、电压基准、前端运放）用超低噪声LDO（正轨TPS7A47、负轨TPS7A33）做二级稳压，将开关纹波压制到µV级。功率级（电流源调整管/功率运放）可直连未经LDO的±15V/±12V开关轨以减小自身损耗与散热压力，其供电噪声由闭环控制与器件PSRR吸收。

### 关键参数 / 指标
- 模拟轨噪声：超低噪LDO（TPS7A47）输出噪声≈4µV RMS（10Hz–100kHz）；“DC/DC+LDO”总RMS噪声≈100µV，“仅DC/DC”≈240µV（TIDA-01566实测，10Hz–100kHz，300mA）。
- 效率对比：LDO-only在3Vin→1.2V/10mA仅≈40%，DC/DC+LDO≈73%，DC/DC-only≈84%（TIDA-01566）；高负载下LDO后级损耗是热管理主因。
- 后级LDO损耗：典型模拟前端可达≈1.5W（NEST125），负载>2A时LDO损耗引发效率与热问题，可改用低噪buck或降低LDO压差。
- 功率运放热阻：OPA549 θJC(顶部)≈17.4°C/W，θJC(底部焊盘)≈0.1°C/W，配散热片后θJA可达≈1.4°C/W（TI E2E）。
- 功率运放结温/功耗：可靠工作Tj≤125°C；内部热关断≈160°C、复位≈140°C；SOA脉冲能力Tc=25/85/125°C对应PD≈18W/47W/90W（数据手册SOA，脉冲工况）。
- MOSFET线性电流源耗散：Pd=Ids·Vds，恒流源本质线性调整、效率不可能高（理论损耗=Iout²·Rsense+Iout·(Vsup−Vload−Vsense)）。
- MSPM0G3507供电：VDD 1.62–3.6V（典型3.3V），RUN模式≈101µA/MHz，内置POR/BOR，无严格上电时序要求。
- PSRR与噪声耦合：典型运放DC PSRR≈5µV/V；电源噪声经PSRR折算为输入失调/误差，接近直流应用还需关注1/f噪声（ADC3910电源建议）。
- 负轨生成能力：inverting buck-boost（TPS62933）12V→−12V可达1.2A；boost+电荷泵（TLV61048）从3.3/5V生成±12V，约百mA级。

### 推荐器件 / 型号
- **TPS62933 / TPS560430（inverting buck-boost 降压-升压/反相）**
- **TPS7A47（正）+ TPS7A33（负）超低噪声LDO**
- **TPS7A20 / TLV755P（数字3.3V LDO）**
- **TPS62912 / TPS62913（低噪声buck）**
- **OPA549 功率运放**
- **线性模式优化MOSFET（如Infineon/IXYS线性区优化器件，或低Vgs(th)、线性SOA充足的器件）**
- **TLV61048 + 分立电荷泵**
- **TPS55010 fly-buck**

### 权威来源
- **NEST125 如何以低噪声和低纹波设计技术强化电源与信号完整性（TI技术文章）** — https://www.ti.com/lit/pdf/nest125  
  > 经典低噪架构：DC/DC+LDO+铁氧体磁珠；指出后级LDO在>2A负载时增加≈1.5W损耗，提出用低噪buck（TPS62912/13）替代LDO。
- **TIDA-01566 超低噪电源参考设计指南（TI）** — https://www.ti.com/cn/lit/ug/zhcu521/zhcu521.pdf  
  > 对比“仅LDO/仅DC-DC/DC-DC+LDO”三架构的噪声与效率实测（噪声100µV vs 240µV；效率40%/84%/73%）。
- **ADC3910 数据手册—电源相关建议（TI）** — https://www.ti.com.cn/document-viewer/cn/ADC3910D025/datasheet/GUID-31919CF8-06AC-476F-9002-C53A7F3B2CF2  
  > 推荐“高效开关+低噪LDO二级稳压”；强调AVDD与IOVDD不共享、接近直流应用需考虑1/f噪声、频率规划。
- **TI Precision Labs：了解ADC系统中的电源噪声 / 电源噪声缓解技术（视频）** — https://www.ti.com.cn/zh-cn/video/6360886170112  
  > PSRR定义与测量、热噪声vs开关纹波；去耦、频率规划、布局隔离、铁氧体磁珠抑制时钟瞬态。
- **OPA549 数据手册（TI）** — https://pdf.product.network/9705fb6c/ti.com/OPA549T.html  
  > 功耗Pd=Iout·(Vs−Vo)、SOA曲线、热阻θJA=θJC+θCH+θHA、热关断≈160°C、可靠Tj≤125°C、需配散热片。
- **SLVAE10 / SLVAFH1 / SLVAEJ3（TI应用报告：反相电源与电荷泵生负轨）** — https://www.ti.com.cn/cn/lit/pdf/slvae10  
  > inverting buck-boost（TPS560430/TPS62933）与boost+电荷泵（TLV61048）生成±12V/±15V的设计步骤与实例。
- **MSPM0G3507 数据手册（TI）** — https://www.ti.com/lit/ds/symlink/mspm0g3506.pdf  
  > 供电1.62–3.6V、POR/BOR上电时序、RUN≈101µA/MHz、内部模拟外设与DAC/ADC指标。
- **Infineon 应用笔记：Linear Mode Operation and Safe Operating Area of Power-MOSFETs** — https://www.infineon.com/dgdl/Infineon-ApplicationNote_Linear_Mode_Operation_Safe_Operation_Diagram_MOSFETs-AN-v01_00-EN.pdf  
  > 线性区SOA：现代低Rds MOSFET die面积缩小导致线性工作耐受下降，恒流源选型须重视SOA。
- **Digi-Key：Design Tips for Generating Split-Rail Power Supplies（含TI TPS54060/TPS55010）** — https://www.digikey.ca/en/articles/design-tips-for-generating-split-rail-power-supplies  
  > 分轨（±18V@100mA）与隔离fly-buck（±15V@40mA）方案综述。

### 对本项目的意义
- 恒流源的输出精度直接受电轨噪声与稳定性影响：DAC设定值、ADC反馈采样、电压基准均对电源PSRR敏感，开关纹波与1/f噪声会直接折算为输出电流误差；模拟闭环控制算法（PID/数字调控）依赖稳定的参考与低噪采样，因此电源架构是“电流精度”评分项的基础。功耗与热设计决定装置能否在单端口、可能短路或低阻负载的工况下长时间稳定满额输出，并直接影响“外观工艺”与可靠性答辩——散热片/结构件既是热方案也是外观件，合理电源树（数字/模拟分离、降低纹波）同时提升精度与工艺表现。

### 风险 / 注意点
- 线性恒流源效率本质低：Pd=Iout²·Rsense+Iout·(Vsup−Vload)，大电流+低压差时调整管功耗巨大，必须按最坏工况（输出短路/最低compliance电压，Pd≈Iout·2·Vsup）进行散热设计。
- 开关纹波耦合：若频率规划不当使开关频率落入ADC数字滤波器阻带或基准/运放敏感频段，会经PSRR转化为电流误差。
- 数字/模拟电源未分离、AGND/DGND处理不当，导致数字开关噪声耦合进模拟信号链。
- 功率运放高频工作静态电流激增（slew-rate受限），正弦输出在>50–100kHz可能产生过量发热。
- MOSFET线性区SOA风险：现代低Rds MOSFET die面积小、线性工作耐受差，选型不当易热失效。
- inverting buck-boost负轨随负载电流增大而电压跌落（无直接稳压反馈），需留裕量或加后级LDO。
- 热关断（≈160°C）不可作为常规保护，连续运行须保证Tj≤125°C并配置足够散热片/结构件。
- 单端口恒流源compliance电压有限，若“满电流×满压降”的功耗预算不足，会触发保护或被迫降额，影响指标达成。

### 不确定项（需实验/进一步确认）
- 项目尚未明确输出电流范围、最大负载电阻及短路工况，调整管功耗与散热规模“不确定”。
- 是否需要隔离±15V还是非隔离±12V（题目为“+/-15V/12V 等”），最终架构选型“不确定”。
- 正弦输出最高频率（“低频”未量化），影响功率运放选型与热预算，“不确定”。
- 整机输入源（外部适配器电压/电池规格）未定，电源树第一级（buck输入电压） “不确定”。
- 具体效率、热阻数值随最终器件与PCB/散热结构而异，需实测确认，“不确定”。
- 调整管采用MOSFET还是功率运放取决于电流等级，尚未确定，“不确定”。

<a id="item_10_pcb_layout"></a>
## 10. PCB 工艺与数模混合布局

### 核心结论 / 推荐方案
- 数模混合 PCB 的核心策略是「分区不分地」：将模拟电路（采样电阻、运放/电流检测放大器、基准源、DAC 输出级）与数字电路（MSPM0G3507 及其数字接口、开关电源、时钟）按功能分区放置，但整板使用统一实心接地层，仅保留一个接地节点。TI Precision Labs 明确指出不应把地平面物理分割成「模拟地」和「数字地」两块互不相连的平面；分区靠布局实现，返回电流路径不要交叉即可。A/D、D/A 类器件跨分区放置，并在其下方/附近将两地以单点（星型）连接桥接。对于本项目恒流源，采样与功率回路是大电流低频/直流，数字部分是 MCU 控制，关键是让功率电流的大地返回路径与敏感模拟采样地分离且短直。
- 电流采样走线必须采用四线（开尔文/Kelvin）连接：两条大电流走线只负责载流，两条感测走线从分流电阻焊盘内侧直接、对称、短距离引到电流检测放大器（CSA）输入端，且感测走线之间、感测线与功率线之间长度/宽度尽量一致以减少偏置电流引起的失调。当分流电阻 <1mΩ（尤其是 <0.5mΩ）时四线接法几乎是必须的；本项目若用 mΩ 级采样电阻（常见 10mA~数百 mA 量程需要较大阻值，但功率级可能用毫欧级），务必遵循电阻厂家给定的焊盘（大电流焊盘 + 小开尔文感测焊盘）landing pad 规范，否则 trace 电阻会引入 1%~2.5% 的误差。CSA 应紧靠采样电阻（<10mm），并在其电源引脚就近放置约 1nF 去耦电容。
- 电源去耦与散热铺铜：每个 IC 电源引脚就近（<0.5cm）放低 ESR 陶瓷电容，优先 0.1μF、并在调节器/连接器入口放 1~10μF；采用 0.1μF/0.01μF/1μF 多值并联覆盖宽频，最小容值最靠近引脚，电容同层放置、其地与 IC 地之间用 2~3 个过孔低感连接，禁止在旁路电容与 IC 电源/地引脚之间放过孔。功率器件（输出 MOSFET、功率运放、LDO）的散热焊盘接到实心铜层，用 1.5oz~2oz 铜、加散热过孔阵列（TI 建议约 20mil/8mil 直径）降低热阻。EMC 方面：保持连续地平面、电源/功率平面远离板边、对开关噪声源（DC-DC、数字时钟）就近加铁氧体磁珠 π 型滤波或共模扼流圈、正确滤波连接器、缩短大电流环路面积（减小天线效应）。
- 外观工艺（独立评分项）建议：用 4 层板（信号-地-电源-信号）以获得完整参考面与最小环路，板面按功能模块分区且评审俯视逻辑自明；外壳用 3D 打印（FDM/光固化）或钣金，预留与 PCB 螺丝柱对应的安装孔、与接插件/显示/按键对应的开孔；单端口电流输出用锁紧端子（如螺钉式接线端子、香蕉头或 XT30/尾插）确保接触可靠且便于测评插拔；板面加规范丝印（网络名、测试点、大赛 LOGO、端口极性、队号留白）；评审专家 30 秒内形成第一印象，模块对称、铜皮规整、焊接工整、整机固定可靠可隐性加分。避免板厚过薄导致强度不足，底面尽量平整便于贴合外壳/散热。

### 关键参数 / 指标
- 接地方式：统一实心接地层 + 模拟/数字分区布局，不分割地平面；A/D、D/A 跨分区放置，单点（星型）桥接两地；返回电流路径不得交叉
- 采样走线：四线（Kelvin）连接，感测走线与功率走线分离；分流电阻 <1mΩ 时四线接法必要，<0.5mΩ 几乎强制；感测走线对称、等长、短（CSA 距采样电阻 <10mm）
- 去耦电容：每个 IC 电源引脚就近 <0.5cm 放置低 ESR 陶瓷电容，常用 0.1μF，调节器/连接器入口 1~10μF；建议 0.1μF/0.01μF/1μF 多值并联，最小容值最靠近引脚；电容与地用 2~3 过孔低感连接，禁止在电容与 IC 之间放过孔
- 电流检测放大器去耦：在 CSA 的 SNx/SPx 感测引脚附近放置约 1nF 去耦电容
- 铺铜/散热：功率器件散热焊盘接实心铜层；建议 1.5oz~2oz 铜厚；散热过孔阵列（TI 建议直径 20mil、孔 8mil），直接连接以降低热阻；铜厚加倍可使同尺寸平面热阻减半
- 层叠：优先 4 层板（顶层信号/底层信号 + 完整中间地平面与电源平面），以获得受控阻抗、最小环路与参考面屏蔽；若用 2 层板需保证信号线下有连续回流地
- 走线规则：模拟信号尽量包地、间隔 ≥200mil 打地过孔；模拟线宽 ≥10mil、尽量不打过孔；大电流路径加宽并缩短、减少换层次数；差分/感测对按 5W 间距（线宽5倍）避免串扰
- EMC：保持连续地平面、电源/功率平面远离板边；开关噪声源（DC-DC、时钟）就近加铁氧体磁珠 π 型滤波或共模扼流圈；连接器正确滤波；缩短大电流环路面积以降低辐射
- 板厚与强度：避免选用过薄板厚（如 0.8mm 易软），单端口电流输出端用可靠接插件并预留足够焊盘/铜皮过流
- 丝印与标识：规范丝印（网络名、测试点、端口极性、大赛 LOGO）；评审页/板面不得出现学校与队号（按赛规密封要求）

### 推荐器件 / 型号
- **4 层板层叠（SIG-GND-PWR-SIG）**  
  > 提供完整地/电源参考面，最大限度减小环路面积与串扰，TI 与 EMC 指南均推荐多层板优于 2 层板；对本项目数模混合+功率回路最稳妥
- **四端子（Kelvin）采样电阻或 2 端子分流电阻 + 自定义四线焊盘**  
  > 毫欧级采样时四线接法可降低接触/走线电阻误差；TI SLOA256/SLVAF66 强调 Kelvin 连接是电流检测精度关键；2 端子+优化焊盘在 <1% 精度原型中性价比更高
- **低 ESR X7R 陶瓷去耦电容（0402/0603，0.1μF、1nF、1~10μF 多值）**  
  > TI 去耦指南要求低 ESR、小尺寸、多值并联覆盖宽频；0402/0603 寄生电感小，适合高频旁路
- **铁氧体磁珠 π 型滤波（电源入口/DC-DC 输入）**  
  > TI EMC 指南建议对开关电源噪声源就近加铁氧体磁珠与电容形成低通，抑制传导与辐射发射
- **共模扼流圈（若外部供电/输出线缆较长）**  
  > TI EMC 应用笔记指出输入/输出线缆上的共模噪声可在连接器处加共模扼流圈抑制
- **单端口电流输出接插件：螺钉式接线端子 / 香蕉头座 / XT30 或同轴线插座**  
  > 恒流源为单端口输出，需接触可靠、便于测评插拔与长时间通电；锁紧端子抗振动、接触电阻稳定，利于电流精度与外观工艺分
- **3D 打印外壳（FDM/光固化）或铝合金/钣金外壳 + 沉头螺丝柱**  
  > 往届电赛经验显示外壳规整、开孔准确、固定可靠可隐性提升工艺印象分；预留与 PCB 安装孔、接插件、显示/按键对应的开孔
- **规范丝印层（端口极性、测试点 TP、网络名、大赛 LOGO 区）**  
  > 评审俯视时模块分区逻辑自明、标识清晰可加分；注意赛规要求板面/报告不得出现校名队号，LOGO 区留白处理
- **散热过孔阵列 + 2oz 铜（功率输出级）**  
  > 恒流源在较大电流下功率器件温升明显，TI 电机/功率指南建议散热焊盘接实心铜并加过孔阵列、用 1.5~2oz 铜降低热阻，保障长时间测评稳定

### 权威来源
- **TI Precision Labs – Op Amps: Op Amp PCB Layout – Mixed Signals, Grounding & Bypass Capacitors (PDF)** — https://www.ti.com/content/dam/videos/external-videos/es-mx/8/3816841626001/6245227303001.mp4/subassets/op_amp_pcb_layout_mixed_signals_grounding_and_bypass_capacitors.pdf  
  > 核心：模拟/数字信号分离、分区而非分割地平面、统一实心接地层、去耦电容就近放置。直接支撑本项目数模混合接地策略
- **TI Precision Labs – Current Sense Amplifiers: Shunt Resistor Layout Considerations (PDF)** — https://www.ti.com/content/dam/videos/external-videos/en-us/4/3816841626001/6076326896001.mp4/subassets/current-sense-amplifiers-shunt-resistor-layout-presentation-quiz.pdf  
  > 电流检测采样电阻布局三原则：靠近 CSA、使用 Kelvin 连接、遵循电阻厂家焊盘规范；给出 8mΩ/10A 下错误布局引入约 2.5% 误差的量化示例
- **TI Application Note SLVAF66: What is a Kelvin Connection?** — https://www.ti.com/document-viewer/ja-jp/lit/html/SLVAF66/GUID-B0AD1F2F-7BA1-4F74-9181-53D005914E86  
  > 开尔文连接定义与要点：主电流路径与感测路径分离、缩短电阻到感测引脚距离、感测路径等长等宽、差分走线、遵循 landing pad 建议
- **TI Application Report SLVA959B: Bypass Capacitor Placement (电源旁路电容布局)** — https://www.ti.com/lit/an/slva959b/slva959b.pdf  
  > 去耦电容具体规则：<0.5cm 就近、同层、禁止电容与 IC 间放过孔、多过孔低感、长宽比 <3:1；含电流检测放大器附近约 1nF 去耦建议
- **TI Application Note SPRACP4: High-Speed PCB Layout (混合信号/高速布局)** — https://www.ti.com.cn/lit/pdf/spracp4  
  > 分区、跨分割用 stitching 电容/过孔桥接、差分对 5W 间距、参考面连续、避免电源平面重叠产生寄生电容；支撑分区与 EMC 规则
- **TI Application Report SLAA856A: Printed Circuit Board Design for EMC** — https://www.ti.com/document-viewer/lit/html/SLAA856A/GUID-CDDCBC9B-AB02-4E10-92F0-70EFBCA998CE  
  > EMC PCB 指南：高频去耦就近、连续地平面、电源平面远离板边、连接器滤波、铁氧体/缓冲就近、缩短未滤波环路与走线长度
- **TI Application Note SDAA401: Optimizing EMC in Isolated Designs – 10 PCB Techniques** — https://www.ti.com/lit/pdf/SDAA401  
  > 10 项 EMC 改善技术：引脚高频去耦、电容组相对位置、铁氧体 π 滤波、隔离铜岛、共模扼流圈、Y 电容、100μF 大电容等，可迁移到非隔离设计
- **TI E2E China: Simplifying Current Sensing (PDF)** — https://e2echina.ti.com/cfs-file/__key/communityserver-discussions-components-files/52/Simplifying-Current-Sensing.pdf  
  > 四线（Kelvin）电阻连接图示与精度说明，指出 shunt <0.5mΩ 时四线接法最常见；提到集成采样电阻器件（INA250/253/260）可降低布局难度
- **TI Application Note SDAA115: Optimal Layout Practices for Low-Ohmic Current Sense Resistors in Parallel** — https://www.ti.com.cn/kr/lit/pdf/sdaa115  
  > 并联低阻采样电阻布局：需对称等长走线、以中心/独立 Kelvin 点取压，辅助电阻（焊料、铜皮）约 10~500μΩ/方，影响毫欧级精度
- **凡亿PCB/腾讯网：干货！数模混合板布局布线设计要点** — https://new.qq.com/rain/a/LNK2024102200697600  
  > 中文实战要点：数模分区、模拟地数字地是否分割看手册、分割带 ≥20mil、跨分割用磁珠/0Ω 桥接、信号流有序排布、模拟包地、线宽 ≥10mil
- **搜狐：数字地、模拟地，到底要怎么铺？** — https://www.sohu.com/a/420837412_100281310  
  > 解释 EM C 两原则（减小环路面积、单一参考面），倾向统一地+分区布线，避免地分割带来辐射与串扰；与 TI 观点一致
- **立创电赛经验：竞赛 PCB 平衡电气性能/工艺可行性/视觉美学（hqwc.cn）** — http://www.hqwc.cn/news/1592047.html  
  > 竞赛 PCB 三重维度：模块分区逻辑自明、视觉对称加分、预留丝印空间、大电流过孔阵列、铜皮规整；支撑外观工艺评分策略
- **全国大学生电子设计竞赛全方位备赛指南（3y4.net）** — https://www.3y4.net/others/1047  
  > 评分占比与提分要点：硬件整洁、布线规范、焊接工整、整机外观规整可隐性提升评委印象分；强调模拟/数字分区与抗干扰设计

### 对本项目的意义
- 本项目为「可编程恒流信号源」，本质就是典型的数模混合系统：数字侧 MSPM0G3507 跑控制算法（PI/闭环），模拟侧由 DAC/运放/功率管构成输出级，并用分流电阻+电流检测放大器做模拟闭环采样反馈。电流精度评分直接取决于采样链路的布局——毫欧级分流电阻若不用四线 Kelvin 连接、感测走线不等长或靠近数字噪声，会引入可观的系统误差，与「电流精度」评分项强相关。
- 外观工艺为独立评分项，PCB 的板面分区、接插件选型、外壳/面板/丝印规整度直接决定印象分；而单端口输出的可靠接插件与稳定散热铺铜又影响长时间测评时的精度稳定性与抗扰表现。因此本条目给出的 Layout 检查清单既是技术报告可引用的依据，也是实做与答辩的硬支撑。

### 风险 / 注意点
- 误用地分割：把模拟地与数字地切成两块互不相连平面，迫使返回电流绕行外部电源形成大环路天线，反而增大辐射与串扰（TI 明确反对；应分区不分地、单点桥接）
- 采样电阻未用四线连接：感测走线接到载流焊盘而非独立 Kelvin 焊盘，毫欧级下 trace 电阻引入 1%~2.5% 误差，直接拉低电流精度
- 去耦电容放置不当：电容与 IC 电源/地引脚之间放过孔、或距离 >0.5cm、未多过孔低感连接，导致高频环路阻抗升高、去耦失效
- 大电流环路面积过大：功率回路长且多换层，形成天线效应与电压纹波，影响输出稳定与 EMC
- 散热不足：功率器件仅用细走线散热、未接实心铜/缺散热过孔、铜厚偏薄，长时间通电温升导致基准/采样漂移、精度下降
- 模拟感测走线贴近数字时钟/开关电源：电容/电感耦合引入噪声，闭环带宽内出现抖动
- 外观工艺疏漏：外壳开孔偏差、接插件松动、丝印缺失或违规出现校名队号、板面杂乱，损失独立工艺分与印象分
- 2 层板强行做数模混合：缺乏完整参考面，回流路径差、EMC 与串扰风险高，建议优先 4 层板

### 不确定项（需实验/进一步确认）
- 本项目具体电流量程与所需采样电阻阻值/封装尚未确定，故『是否必须使用四端子 Kelvin 电阻 vs 2 端子+优化焊盘』的最终选择不确定，需待指标确定后按 <1mΩ 阈值判断
- 是否采用隔离电流检测（如数字隔离 CSA）以进一步提升抗扰，取决于系统共模与测评环境，当前不确定
- 外壳材质（3D 打印/FDM vs 光固化 vs 钣金/铝合金）与是否需屏蔽壳体，取决于预算、重量与 EMC 实测，当前不确定
- 具体去耦电容容值组合（是否需 0.01μF 极小容值、铁氧体磁珠型号）需结合 MCU 与 DC-DC 开关频率实测后确定，当前不确定
- 板厚与铜厚最终规格（1oz vs 2oz、1.6mm vs 更厚）需结合电流值与打样工艺确定，当前不确定
- 竞赛评分细则中『外观工艺』独立项的具体权重与评审侧重点（不同赛区/年份可能不同），以当年官方实施细则为准，此处不确定
