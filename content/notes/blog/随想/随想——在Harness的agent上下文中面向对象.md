---
blog: true
title: "在 Harness 的 agent 上下文中面向对象"
slug: "object-oriented-agent-context-in-harness"
summary: "探讨 agent 在 Harness 中如何通过维护 object 和自定义 property 来管理多变的外部环境实体，实现上下文的实时感知与反馈。"
date: 2026-09-05
category: "随想"
featured: false
tags:
  - "Agent"
  - "Harness"
  - "上下文管理"
  - "面向对象"
---

痛点：agent在Harness中面临外部多变且一定缺乏监控和反馈的环境，我电脑连接了单片机，单片机扩展板的外设阴阳极情况agent不清楚，我说了之后他上下文一长也记不住；我连接了华为手机，它没法实时监测华为手机的界面有没有被我手动切走，截图时总要截一个无关图片，之后才纠错；远程ssh连接进行操作，有时我的代理环境不稳定，他就难以解决问题。上下文中对这些实际交互的实体并没有清晰的概念，这些实体的形式化代码的更新和一些轮询就能产生的即时性信息在每次Provider turn之前，并不一定得到及时的更新，但其实这些都可以被解决，只需要我们在上下文中维护object以及各种各样可以自定义的property
