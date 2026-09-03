---
blog: true
title: "Deepseek Harness 抢救日志 (0830)"
slug: "deepseek-harness-rescue-log-0830"
summary: "记录 Deepseek Harness 在 webui、景甜模型接入、限速重试等方面的若干 bug 与排查过程。"
date: 2026-08-30
category: "调试日志"
featured: false
tags:
  - "Deepseek"
  - "调试"
  - "Harness"
  - "日志"
---

# Deepseek Harness 抢救日志 (0830)

## 发现的bug——症状描述
1. Deepseek Harness的webui界面，左侧边栏的“SSH”栏目，点击进入之后，之前正确配置的台式机主机没有出现在列表中，取而代之的是一个红色报错：出错：HTTP 404: invalid JSON response。这个错误在台式机和笔记本上均出现，怀疑是dsh-ssh插件的锅
2. 景甜接入的模型全都没有思考强度，这导致了类似如下的对话中报错：
	```
	本轮运行失败400: {"message":"The request is invalid: 角色信息不正确. Please check the request body, required fields, and request format.","type":"invalid_request_error","param":"","code":"400001"}
	```
	另外，记忆系统如果在dsh的默认subagent设置为任何一个景甜模型时，会出现报错，原因也是因为景甜模型不接受这个推理强度的配置项，但是目前的dsh的接口都会输出这个配置项
3. 景甜模型作为免费模型，存在一定的限速限流，dsh在限速限流时，重试5次失败之后，就会直接关停这个会话，直到人为介入。
