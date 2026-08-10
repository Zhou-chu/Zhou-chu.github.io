---
blog: true
title: "admit()函数详解"
slug: "admit-函数详解-mscuwj4r"
summary: "SessionInput.admit() 鈥?閫愯瑙ｆ瀽 鏂囦欢 锛歚packages/core/src/session/input.ts 锛? 绗?41 81 琛? 鍓嶇疆绫诲瀷 绗?51 52 琛岋細骞傜瓑妫€鏌? find() 鏌? SessionInputTable 锛氳繖涓?messageID 鏄笉鏄凡缁忔寔涔呭寲杩囦簡锛? 濡傛灉鏈? 鈫?鐩存帴杩斿洖宸叉湁鐨? Admitted 瀵硅薄銆傝繖鏄竴灞傚箓绛変繚鎶わ細鍚"
date: 2026-08-03
category: "Opencode手撕代码"
featured: false
---

## `SessionInput.admit()` 鈥?閫愯瑙ｆ瀽
**鏂囦欢**锛歚packages/core/src/session/input.ts`锛?*绗?41-81 琛?*
### 鍓嶇疆绫诲瀷
```typescript
// 杈撳叆鍙傛暟
input: {
  readonly id: SessionMessage.ID       // 娑堟伅鐨勫敮涓€ ID锛堣皟鐢ㄦ柟棰勭敓鎴愶級
  readonly sessionID: SessionSchema.ID // 浼氳瘽 ID
  readonly prompt: Prompt              // 鐢ㄦ埛杈撳叆鐨勫畬鏁村唴瀹?  readonly delivery: Delivery          // 鎶曢€掓ā寮忥紙濡?"user" / "background"锛?}

// 杩斿洖鍊?Admitted = {
  admittedSeq: number        // 鎸佷箙鍖栦簨浠剁殑鑱氬悎搴忓垪鍙凤紙鍦ㄤ簨浠舵祦涓殑浣嶇疆锛?  id: SessionMessage.ID
  sessionID: SessionSchema.ID
  prompt: Prompt
  delivery: Delivery
  timeCreated: DateTime.Utc
  // 娉ㄦ剰锛氭病鏈?promotedSeq 瀛楁鈥斺€攁dmit 闃舵杩樻病 promotion
}
```
### 绗?51-52 琛岋細骞傜瓑妫€鏌?```typescript
const existing = yield* find(db, input.id)
if (existing !== undefined) return existing
```
`find()` 鏌?`SessionInputTable`锛氳繖涓?messageID 鏄笉鏄凡缁忔寔涔呭寲杩囦簡锛?- **濡傛灉鏈?* 鈫?鐩存帴杩斿洖宸叉湁鐨?`Admitted` 瀵硅薄銆傝繖鏄竴灞傚箓绛変繚鎶わ細鍚屼竴涓緭鍏?admit 涓ゆ涓嶄細浜х敓閲嶅浜嬩欢銆?- **濡傛灉娌℃湁** 鈫?缁х画寰€涓嬨€?> **涓轰粈涔堥渶瑕佸箓绛夛紵** HTTP 璇锋眰鍙兘閲嶈瘯锛屾垨鑰呰皟鐢ㄦ柟涓嶇‘瀹氫笂娆℃槸鍚︽垚鍔熴€俙admit` 淇濋殰"鍚屼竴涓?ID 鍙骇鐢熶竴娆″壇浣滅敤"銆?### 绗?53 琛岋細鑾峰彇鏃堕棿鎴?```typescript
const timestamp = yield* DateTime.now
```
杩欐槸涓€涓?Effect 鍓綔鐢ㄢ€斺€旇绯荤粺鏃堕挓銆傛椂闂存埑鍚庨潰浼氳鍐欒繘浜嬩欢鍜?`Admitted` 杩斿洖鍊笺€?### 绗?54-61 琛岋細鍙戝竷浜嬩欢锛堟牳蹇冿級
```typescript
return yield* events
  .publish(SessionEvent.PromptAdmitted, {
    messageID: input.id,
    sessionID: input.sessionID,
    timestamp,
    prompt: input.prompt,
    delivery: input.delivery,
  })
```
**`admit()` 鑷繁涓嶅啓鏁版嵁搴撱€?* 瀹冨彂甯冧竴涓?`PromptAdmitted` 浜嬩欢銆傝繖鍜屼綘鍦?System Context 閲岀湅鍒扮殑妯″紡涓€妯′竴鏍封€斺€擿ContextUpdated` 涔熸槸鍏堝彂浜嬩欢锛屾姇褰卞櫒鍐嶅啓搴撱€?`events.publish()` 鐨勮繑鍥炴槸涓€涓?`EventV2.Published` 瀵硅薄锛屽叧閿瓧娈垫槸 `durable`锛氫簨浠跺湪鎸佷箙鍖栦簨浠舵祦涓殑鑱氬悎淇℃伅銆傚鏋滀簨浠惰鎴愬姛鎸佷箙鍖栵紝`durable` 鍖呭惈 `seq`锛堜簨浠跺簭鍒楀彿锛夈€?### 绗?62-75 琛岋細浠庝簨浠舵彁鍙?admittedSeq
```typescript
.pipe(
  Effect.flatMap((event) =>
    event.durable === undefined
      ? Effect.die("Prompt admission event is missing aggregate sequence")
      : Effect.succeed(
          Admitted.make({
            admittedSeq: event.durable.seq,   // 鈫?鏉ヨ嚜浜嬩欢绯荤粺鐨勬寔涔呭寲搴忓垪鍙?            id: input.id,
            sessionID: input.sessionID,
            prompt: input.prompt,
            delivery: input.delivery,
            timeCreated: timestamp,
          }),
        ),
  ),
```
杩欓噷鍋氫袱浠朵簨锛?1. **闃插尽鎬ф鏌?*锛氬鏋?`event.durable === undefined`锛堟剰鍛崇潃浜嬩欢娌¤鎸佷箙鍖栤€斺€旂悊璁轰笂涓嶅簲璇ュ彂鐢燂級锛岀洿鎺?`Effect.die`锛堣嚧鍛界己闄凤級銆?2. **姝ｅ父璺緞**锛氱敤 `event.durable.seq` 浣滀负 `admittedSeq`锛屾瀯寤?`Admitted` 杩斿洖鍊笺€?`admittedSeq` 鏄簨浠舵祦涓殑鍏ㄥ眬閫掑搴忓彿锛屽悗缁殑 promotion 鍜屾秷鎭帓搴忛兘浼氱敤鍒板畠銆?### 绗?77-79 琛岋細缂洪櫡鎭㈠锛堟渶绮惧鐨勯儴鍒嗭級
```typescript
Effect.catchDefect((defect) =>
  find(db, input.id).pipe(
    Effect.flatMap((stored) => (stored ? Effect.succeed(stored) : Effect.die(defect))),
  ),
)
```
杩欐澶勭悊涓€涓竟鐣屾儏鍐碉細
> 浜嬩欢绯荤粺鐨勬姇褰卞櫒锛坄projectAdmitted`锛岀 83-116 琛岋級**寮傛**鍦版妸浜嬩欢鍐欏叆 `SessionInputTable`銆傚鏋?`events.publish()` 鏈韩鍥犱负闈炶嚧鍛藉師鍥犳姏浜?defect锛屼絾瀹為檯涓婃姇褰卞櫒宸茬粡瀹屾垚浜嗘暟鎹簱鍐欏叆鈥斺€旈偅杩欐潯杈撳叆鍏跺疄宸茬粡鎸佷箙鍖栨垚鍔熶簡銆?
鎵€浠?recovery 绛栫暐锛?
| 鍦烘櫙      | `find(db, input.id)` 缁撴灉 | 琛屼负                          |
| ------- | ----------------------- | --------------------------- |
| DB 閲屾湁璁板綍 | `stored !== undefined`  | 鎶曞奖鍣ㄥ啓鍏ユ垚鍔熶簡 鈫?杩斿洖宸叉湁鐨?`Admitted` |
| DB 閲屾病鏈? | `stored === undefined`  | 纭疄娌℃寔涔呭寲 鈫?閲嶆柊鎶涘嚭鍘熷 defect      |
杩欐槸涓€涓粡鍏哥殑"at-least-once 鍐欏叆 + 鏌ヨ鍏滃簳"妯″紡锛氫笉淇′换浜嬩欢鍙戝竷鐨勮繑鍥炵姸鎬侊紝鑰屾槸浠?*鏁版嵁搴撻噷鏈夋病鏈夎褰?*浣滀负鏈€缁堢湡鐩搞€?### 瀹屾暣鎵ц娴佺▼鍥?```
admit(id, sessionID, prompt, delivery)
鈹?鈹溾攢 find(db, id) 鈫?宸插瓨鍦紵
鈹?  鈹斺攢 YES 鈫?鐩存帴杩斿洖宸叉湁鐨?Admitted锛堝箓绛夛級
鈹?鈹溾攢 DateTime.now 鈫?timestamp
鈹?鈹溾攢 events.publish(PromptAdmitted, {...})
鈹?  鈹?鈹?  鈹溾攢 event.durable === undefined锛?鈹?  鈹?  鈹斺攢 YES 鈫?Effect.die锛堝紓甯告儏鍐碉級
鈹?  鈹?鈹?  鈹斺攢 event.durable.seq 鈫?admittedSeq
鈹?      鈹斺攢 杩斿洖 Admitted { admittedSeq, id, ... }
鈹?鈹斺攢 catchDefect 鈫?鍙戝竷杩囩▼鎶涗簡 defect
    鈹斺攢 find(db, id) 鈫?DB 閲屾湁浜嗭紵
        鈹溾攢 YES 鈫?杩斿洖宸插瓨鍌ㄧ殑 Admitted锛堟姇褰卞櫒宸插啓鍏ワ級
        鈹斺攢 NO  鈫?閲嶆柊鎶?defect锛堢‘瀹炲け璐ヤ簡锛?```
### admit 鍜?projectAdmitted 鐨勫垎宸?浣犲湪 System Context 妯″潡閲岃杩囩被浼肩殑妯″紡鈥斺€擿ContextUpdated` 鐢?`prepareOnce` 鍙戝竷锛屾姇褰卞櫒鍐?`SessionMessage.System`銆傝繖閲屽畬鍏ㄤ竴鏍风殑鏋舵瀯锛?
| 瑙掕壊 | 鍑芥暟 | 鍋氫簡浠€涔?|
|---|---|---|
| 浜嬩欢鍙戝竷 | `admit()` | 鍙戝竷 `PromptAdmitted` 浜嬩欢锛屾嬁鍥?`admittedSeq` |
| 鎶曞奖鍣?| `projectAdmitted()` | 鎶婁簨浠?payload 鍐欏叆 `SessionInputTable`锛坕d, session_id, admitted_seq, prompt, delivery, time_created锛?|
| 骞傜瓑淇濇姢 | `onConflictDoNothing()` | `INSERT ... ON CONFLICT DO NOTHING`鈥斺€斿悓涓€涓?ID 閲嶅鎻掑叆涓嶆姤閿?|

`admit` 鏈韩涓嶇 `SessionInputTable` 鐨?INSERT 璇彞鈥斺€旈偅鏄姇褰卞櫒鐨勮亴璐ｃ€傝繖绉?浜嬩欢婧?鏋舵瀯鐨勪紭鐐癸細浜嬩欢娴佹槸鍞竴鐪熺浉婧愶紝鏁版嵁搴撹〃鍙槸浜嬩欢鐨勬姇褰辫鍥俱€?
### 鍏抽敭璁捐鍐崇瓥
1. **ID 鐢辫皟鐢ㄦ柟棰勭敓鎴?*锛歚input.id` 涓嶆槸 admit 鍐呴儴鐢熸垚鐨勶紝鑰屾槸璋冪敤鏂癸紙HTTP handler锛夋彁鍓嶅垱寤恒€傝繖鏍峰嵆浣跨綉缁滈噸璇曪紝鍚屼竴涓€昏緫杈撳叆濮嬬粓瀵瑰簲鍚屼竴涓?ID锛屽箓绛夋鏌ユ墠鏈夋剰涔夈€?2. **admit 涓?promotion**锛歛dmit 鍙仛鎸佷箙鍖栵紝涓嶅喅瀹?浠€涔堟椂鍊欒妯″瀷鐪嬪埌"銆俻romotion 鍙戠敓鍦ㄥ悗闈㈢殑 Safe Provider-Turn Boundary锛岀敱 Session Drain 鍗忚皟銆傝繖涓垎绂讳繚璇佷簡锛氬嵆浣?admit 鎴愬姛锛屽鏋滅郴缁熸鍦ㄥ繖锛堜笂涓€涓?Provider Turn 杩樺湪璺戯級锛屾柊杈撳叆涓嶄細绔嬪嵆鎵撴柇锛岃€屾槸鎺掗槦绛夊緟銆?3. **浠?DB 涓烘渶缁堢湡鐩?*锛歚catchDefect` 鐨勬仮澶嶇瓥鐣ヤ笉淇′换浜嬩欢绯荤粺鐨勮繑鍥炵姸鎬侊紝鑰屾槸鍘绘暟鎹簱鏌ャ€傝繖鏄垎甯冨紡绯荤粺閲岀殑缁忓吀妯″紡鈥斺€?涓嶈鐩镐俊浠讳綍鍗曚釜缁勪欢鐨勮繑鍥烇紝鍘绘煡鏉冨▉鏁版嵁婧?銆?杩欎釜鍑芥暟鐨勬牳蹇冩€濇兂涓€鍙ヨ瘽锛?*admit 鏄竴娆?鎸佷箙鍖栨姇绋?锛屼笉鏄?鎵ц瑙﹀彂"鈥斺€斾粈涔堟椂鍊欐墽琛屻€佹€庝箞鎺掗槦锛屾槸鍚庣画 Coordinator 鍜?Runner 鐨勮亴璐ｃ€?*


---
