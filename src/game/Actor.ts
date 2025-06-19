import { Vector2 } from './Vector2'

export interface ActorGroup {
  player: AbstractPlayerActor
  arrows: AbstractArrowActor[]
  enemyGroup?: ActorGroup
  addArrow(arrow: AbstractArrowActor): void
  removeArrow(arrow: AbstractArrowActor): void
}

export abstract class Body {
  public position: Vector2
  public velocity: Vector2
  public directionAngle: number = 0
  public speed: number = 0

  constructor(x: number = 0, y: number = 0) {
    this.position = new Vector2(x, y)
    this.velocity = new Vector2(0, 0)
  }

  update(): void {
    this.position = this.position.add(this.velocity)
  }

  setVelocity(angle: number, speed: number): void {
    this.directionAngle = angle
    this.speed = speed
    this.velocity = Vector2.fromAngle(angle, speed)
  }

  getDistance(other: Body): number {
    return this.position.distance(other.position)
  }

  getDistanceSq(other: Body): number {
    return this.position.distanceSq(other.position)
  }

  getAngle(other: Body): number {
    return this.position.angle(other.position)
  }

  abstract display(p: any): void
}

export abstract class Actor extends Body {
  public rotationAngle: number = 0
  public collisionRadius: number
  public group?: ActorGroup

  constructor(x: number, y: number, collisionRadius: number) {
    super(x, y)
    this.collisionRadius = collisionRadius
  }

  abstract act(): void

  isCollided(other: Actor): boolean {
    return this.getDistance(other) < this.collisionRadius + other.collisionRadius
  }
}

export enum PlayerState {
  MOVE,
  DRAW_SHORTBOW,
  DRAW_LONGBOW,
  DAMAGED
}

export abstract class AbstractPlayerActor extends Actor {
  public state: PlayerState = PlayerState.MOVE
  public aimAngle: number = 0
  public chargedFrameCount: number = 0
  public damageRemainingFrameCount: number = 0
  public fillColor: string

  constructor(x: number, y: number, fillColor: string) {
    super(x, y, 16)
    this.fillColor = fillColor
  }

  isNull(): boolean {
    return false
  }

  abstract isDamaged(): boolean
}

export class NullPlayerActor extends AbstractPlayerActor {
  constructor() {
    super(0, 0, 'transparent')
  }

  act(): void {}
  
  display(): void {}
  
  isNull(): boolean {
    return true
  }

  isDamaged(): boolean {
    return false
  }
}

export class PlayerActor extends AbstractPlayerActor {
  private readonly bodySize = 32
  private readonly halfBodySize = this.bodySize * 0.5
  public isHuman: boolean
  private aiFrameCounter: number = 0
  private aiTarget: Vector2 = new Vector2(320, 320)
  private aiLastShotFrame: number = 0
  private aiPlanUpdateFrame: number = 0

  constructor(x: number, y: number, fillColor: string, isHuman: boolean = false) {
    super(x, y, fillColor)
    this.isHuman = isHuman
  }

  addVelocity(xAcceleration: number, yAcceleration: number): void {
    // 修正：為了減少方向切換延遲，當方向改變時給予立即響應
    let newVelX = this.velocity.x + xAcceleration
    let newVelY = this.velocity.y + yAcceleration
    
    // 如果輸入方向與當前速度方向相反，立即減速並轉向
    if (xAcceleration !== 0 && Math.sign(xAcceleration) !== Math.sign(this.velocity.x)) {
      newVelX = xAcceleration * 3 // 立即轉向
    }
    if (yAcceleration !== 0 && Math.sign(yAcceleration) !== Math.sign(this.velocity.y)) {
      newVelY = yAcceleration * 3 // 立即轉向
    }
    
    // 應用速度限制
    newVelX = Math.max(-10, Math.min(10, newVelX))
    newVelY = Math.max(-7, Math.min(7, newVelY))
    
    this.velocity = new Vector2(newVelX, newVelY)
  }

  act(): void {
    if (this.isHuman) {
      // Human player logic will be handled in GameSystem
    } else {
      // Enhanced AI logic based on original game
      // AI should still be able to move and react even when damaged
      this.runOriginalStyleAI()
    }
    
    this.updateState()
    this.aiFrameCounter++
  }

  private runOriginalStyleAI(): void {
    if (!this.group?.enemyGroup?.player || this.group.enemyGroup.player.isNull()) return

    const enemy = this.group.enemyGroup.player
    const enemyDistance = this.getDistance(enemy)

    // Update AI plan every 10 frames (like original)
    if (this.aiFrameCounter % 10 === 0) {
      this.updateAIPlan(enemy)
    }

    // Execute current plan (only when not damaged)
    if (this.state !== PlayerState.DAMAGED) {
      this.executeAIPlan(enemy, enemyDistance)
    }
  }

  private updateAIPlan(enemy: AbstractPlayerActor): void {
    // 如果自己受傷，優先逃跑（雖然不能移動，但為恢復後做準備）
    if (this.isDamaged()) {
      this.aiPlanType = 'escape'
      this.calculateTacticalPosition(enemy)
      return
    }

    // Check if enemy is damaged - aggressively try to kill
    if (enemy.isDamaged() && Math.random() < 0.7) { // 增加到70%機率
      this.aiPlanType = 'kill'
      return
    }

    // Avoid incoming arrows
    let nearestArrow: AbstractArrowActor | null = null
    let minArrowDistanceSq = 999999
    
    if (this.group?.enemyGroup?.arrows) {
      for (const arrow of this.group.enemyGroup.arrows) {
        const distanceSq = this.getDistanceSq(arrow)
        if (distanceSq < minArrowDistanceSq) {
          nearestArrow = arrow
          minArrowDistanceSq = distanceSq
        }
      }
    }

    // If arrow is close, escape but prepare for counter-attack
    if (nearestArrow && minArrowDistanceSq < 40000) {
      this.aiPlanType = 'escape'
      this.calculateEscapeTarget(nearestArrow)
      return
    }

    // Stay away from enemy if too close, but be more aggressive
    const enemyDistanceSq = this.getDistanceSq(enemy)
    if (enemyDistanceSq < 100000) { // Distance < ~316
      this.aiPlanType = Math.random() < 0.5 ? 'move' : 'jab' // 更平衡的攻守比例
      this.calculateTacticalPosition(enemy)
      return
    }

    // Be more aggressive at medium range
    const enemyDistance = Math.sqrt(enemyDistanceSq)
    if (enemyDistance > 400 && Math.random() < 0.3) { // 增加遠程攻擊機率
      this.aiPlanType = 'kill' // 長弓攻擊
    } else {
      // 增加近戰攻擊頻率
      this.aiPlanType = Math.random() < 0.3 ? 'move' : 'jab' // 70%機率選擇攻擊
    }
    this.calculateTacticalPosition(enemy)
  }

  private aiPlanType: string = 'move'
  private aiMoveTarget: Vector2 = new Vector2(320, 320)

  private calculateEscapeTarget(arrow: AbstractArrowActor): void {
    // 計算箭矢到AI的角度
    const arrowToAI = this.getAngle(arrow) + Math.PI // 從箭矢指向AI的角度
    
    // 計算逃跑角度（垂直於箭矢方向）
    let escapeAngle = arrow.directionAngle + Math.PI/2 // 垂直方向
    
    // 隨機選擇左轉或右轉
    if (Math.random() < 0.5) {
      escapeAngle -= Math.PI // 相反方向
    }
    
    // 計算逃跑目標，確保距離足夠遠
    const escapeDistance = 200 // 增加逃跑距離
    let targetX = this.position.x + escapeDistance * Math.cos(escapeAngle)
    let targetY = this.position.y + escapeDistance * Math.sin(escapeAngle)
    
    // 確保目標在畫布內
    const CANVAS_SIZE = 640
    targetX = Math.max(50, Math.min(CANVAS_SIZE - 50, targetX))
    targetY = Math.max(50, Math.min(CANVAS_SIZE - 50, targetY))
    
    this.aiMoveTarget = new Vector2(targetX, targetY)
    console.log(`AI躲避箭矢: 當前位置(${Math.round(this.position.x)}, ${Math.round(this.position.y)}) 逃跑目標(${Math.round(targetX)}, ${Math.round(targetY)})`)
  }

  private calculateTacticalPosition(enemy: AbstractPlayerActor): void {
    let targetX: number, targetY: number
    
    // Choose position on opposite side of center from enemy
    if (enemy.position.x > 320) {
      targetX = Math.random() * 280 + 20 // Left half，避免邊界
    } else {
      targetX = Math.random() * 280 + 340 // Right half，避免邊界
    }
    
    if (enemy.position.y > 320) {
      targetY = Math.random() * 280 + 20 // Top half，避免邊界
    } else {
      targetY = Math.random() * 280 + 340 // Bottom half，避免邊界
    }
    
    // 確保與當前位置有足夠距離，避免AI停在原地
    const distanceToTarget = Math.sqrt((targetX - this.position.x) ** 2 + (targetY - this.position.y) ** 2)
    if (distanceToTarget < 150) {
      // 如果目標太近，延伸到更遠的位置
      const angleToTarget = Math.atan2(targetY - this.position.y, targetX - this.position.x)
      targetX = this.position.x + 200 * Math.cos(angleToTarget)
      targetY = this.position.y + 200 * Math.sin(angleToTarget)
      
      // 確保在畫布內
      targetX = Math.max(50, Math.min(590, targetX))
      targetY = Math.max(50, Math.min(590, targetY))
    }
    
    this.aiMoveTarget = new Vector2(targetX, targetY)
    
    if (this.aiPlanType === 'move') {
      console.log(`AI戰術移動: 當前位置(${Math.round(this.position.x)}, ${Math.round(this.position.y)}) 目標(${Math.round(targetX)}, ${Math.round(targetY)}) 距離${Math.round(distanceToTarget)}`)
    }
  }

  private executeAIPlan(enemy: AbstractPlayerActor, enemyDistance: number): void {
    // Calculate movement direction
    const ALLOWANCE = this.aiPlanType === 'escape' ? 50 : 100 // 逃跑時更小的容忍度
    let horizontalMove = 0
    let verticalMove = 0
    
    if (this.aiMoveTarget.x > this.position.x + ALLOWANCE) horizontalMove = 1
    else if (this.aiMoveTarget.x < this.position.x - ALLOWANCE) horizontalMove = -1
    
    if (this.aiMoveTarget.y > this.position.y + ALLOWANCE) verticalMove = 1
    else if (this.aiMoveTarget.y < this.position.y - ALLOWANCE) verticalMove = -1

    // 添加調試信息
    if (this.aiPlanType === 'escape' && (horizontalMove !== 0 || verticalMove !== 0)) {
      console.log(`AI逃跑中: 位置(${Math.round(this.position.x)}, ${Math.round(this.position.y)}) 目標(${Math.round(this.aiMoveTarget.x)}, ${Math.round(this.aiMoveTarget.y)}) 移動(${horizontalMove}, ${verticalMove})`)
    }

    // Handle shooting based on plan (but not when damaged)
    if (this.state === PlayerState.MOVE) {
      const framesSinceLastShot = this.aiFrameCounter - this.aiLastShotFrame
      
      // 即使在逃跑，也要尋找攻擊機會
      if (this.aiPlanType === 'escape') {
        // 在逃跑時，如果有安全的攻擊機會就射擊
        if (framesSinceLastShot > 15 && this.canSafelyAttack(enemy, enemyDistance)) {
          this.state = PlayerState.DRAW_SHORTBOW
          this.aimAngle = this.getAngle(enemy)
          this.aiLastShotFrame = this.aiFrameCounter
          console.log('AI邊逃跑邊反擊！')
        }
      } else if (this.aiPlanType === 'kill' && framesSinceLastShot > 30 && enemyDistance > 400) {
        // TODO: 長弓攻擊 先註解以利測試
        // this.state = PlayerState.DRAW_LONGBOW
        // this.aimAngle = this.getAngle(enemy)
        // this.chargedFrameCount = 0
        // this.aiLastShotFrame = this.aiFrameCounter
        // console.log('AI starting longbow attack, distance:', enemyDistance)
        // 修正：只有在距離夠遠時才使用長弓
        this.state = PlayerState.DRAW_SHORTBOW
        this.aimAngle = this.getAngle(enemy)
        this.aiLastShotFrame = this.aiFrameCounter
      } else if (this.aiPlanType === 'jab' && framesSinceLastShot > 12) {
        // Use shortbow for jabbing
        this.state = PlayerState.DRAW_SHORTBOW
        this.aimAngle = this.getAngle(enemy)
        this.aiLastShotFrame = this.aiFrameCounter
      }
    }

    // 修正：AI在長弓狀態下的行為
    if (this.state === PlayerState.DRAW_LONGBOW) {
      // 檢查是否應該取消長弓攻擊
      if (enemyDistance < 400) {
        console.log('AI cancelling longbow - enemy too close:', enemyDistance)
        this.state = PlayerState.MOVE
        this.aiPlanType = 'move' // 強制切換為移動模式
        return
      }

      // 精確瞄準（類似原始遊戲的手動瞄準邏輯）
      const targetAngle = this.getAngle(enemy)
      const angleDiff = targetAngle - this.aimAngle
      let normalizedDiff = ((angleDiff + Math.PI) % (2 * Math.PI)) - Math.PI
      
      // 微調瞄準角度
      if (Math.abs(normalizedDiff) > Math.PI / 180) { // 1度的誤差範圍
        const turnDirection = Math.sign(normalizedDiff)
        horizontalMove = turnDirection
        this.aimAngle += turnDirection * 0.1 * (Math.PI * 2) / 60 // 與原始遊戲相同的轉向速度
      } else {
        horizontalMove = 0
      }

      // 修正：AI也需要等待120幀充能完成，且瞄準夠精確時才發射
      if (this.hasCompletedLongBowCharge() && Math.abs(normalizedDiff) < Math.PI / 180) {
        // 隨機決定是否發射（與原始遊戲AI邏輯一致）
        if (Math.random() < 0.05) {
          this.state = PlayerState.MOVE
          console.log('AI fired longbow!')
        }
      }
      
      // 不允許在瞄準時移動（只能水平轉向）
      verticalMove = 0
    }

    // Handle bow states
    if (this.state === PlayerState.DRAW_SHORTBOW) {
      this.aimAngle = this.getAngle(enemy)
      // 在射擊時也能移動（除非是精密瞄準）
      if (this.aiPlanType === 'jab') {
        // 連續射擊模式，可以移動
        this.addVelocity(horizontalMove * 0.5, verticalMove * 0.5) // 降低移動速度但保持機動性
      } else {
        // 單次射擊後立即切換到移動狀態
        this.state = PlayerState.MOVE
      }
    } else {
      // Apply movement with same force as original game
      this.addVelocity(horizontalMove, verticalMove)
    }
  }

  private updateState(): void {
    // Handle different player states
    switch (this.state) {
      case PlayerState.DAMAGED:
        this.damageRemainingFrameCount--
        if (this.damageRemainingFrameCount <= 0) {
          this.state = PlayerState.MOVE
        }
        break
      case PlayerState.DRAW_LONGBOW:
        this.chargedFrameCount++
        break
    }
  }

  update(): void {
    super.update()

    // Boundary collision exactly like original
    const CANVAS_SIZE = 640
    if (this.position.x < this.halfBodySize) {
      this.position.x = this.halfBodySize
      this.velocity.x = -0.5 * this.velocity.x
    }
    if (this.position.x > CANVAS_SIZE - this.halfBodySize) {
      this.position.x = CANVAS_SIZE - this.halfBodySize
      this.velocity.x = -0.5 * this.velocity.x
    }
    if (this.position.y < this.halfBodySize) {
      this.position.y = this.halfBodySize
      this.velocity.y = -0.5 * this.velocity.y
    }
    if (this.position.y > CANVAS_SIZE - this.halfBodySize) {
      this.position.y = CANVAS_SIZE - this.halfBodySize
      this.velocity.y = -0.5 * this.velocity.y
    }

    // Apply friction exactly like original (0.92)
    this.velocity = this.velocity.multiply(0.92)

    // Update rotation based on movement (same formula as original)
    const velocityMagSq = this.velocity.magSq()
    this.rotationAngle += (0.1 + 0.04 * velocityMagSq) * (Math.PI * 2) / 60
  }

  display(p: any): void {
    p.push()
    p.translate(this.position.x, this.position.y)
    
    p.stroke(0)
    p.fill(this.fillColor)
    
    // 確保矩形模式為CENTER（與原始遊戲一致）
    const oldRectMode = p._renderer._rectMode
    p.rectMode(p.CENTER)
    
    p.push()
    p.rotate(this.rotationAngle)
    p.rect(0, 0, 32, 32)
    p.pop()
    
    // 恢復原來的矩形模式
    p.rectMode(oldRectMode)
    
    // Display state effects
    this.displayStateEffects(p)
    
    p.pop()
  }

  private displayStateEffects(p: any): void {
    switch (this.state) {
      case PlayerState.DAMAGED:
        p.noFill()
        const alpha = 255 * (this.damageRemainingFrameCount / (0.3 * 60))
        p.stroke(192, 64, 64, alpha)
        p.ellipse(0, 0, 64, 64)
        break
      
      case PlayerState.DRAW_SHORTBOW:
        p.stroke(0)
        p.line(0, 0, 70 * Math.cos(this.aimAngle), 70 * Math.sin(this.aimAngle))
        p.noFill()
        p.arc(0, 0, 100, 100, this.aimAngle - Math.PI/4, this.aimAngle + Math.PI/4)
        break
      
      case PlayerState.DRAW_LONGBOW:
        p.noFill()
        p.stroke(0)
        p.arc(0, 0, 100, 100, this.aimAngle - Math.PI/4, this.aimAngle + Math.PI/4)
        
        // 修正：AI長弓充能時間為120幀（2秒），玩家保持30幀（0.5秒）
        const chargeRequiredFrames = this.isHuman ? 30 : 120
        const chargeRatio = Math.min(1, this.chargedFrameCount / chargeRequiredFrames)
        if (chargeRatio >= 1) {
          p.stroke(192, 64, 64)
        } else {
          p.stroke(0, 128)
        }
        
        p.line(0, 0, 800 * Math.cos(this.aimAngle), 800 * Math.sin(this.aimAngle))
        
        // Charge indicator
        p.push()
        p.rotate(-Math.PI/2)
        p.strokeWeight(5)
        p.arc(0, 0, 80, 80, 0, Math.PI * 2 * chargeRatio)
        p.strokeWeight(1)
        p.pop()
        break
    }
  }

  isDamaged(): boolean {
    return this.state === PlayerState.DAMAGED
  }

  isDrawingLongBow(): boolean {
    return this.state === PlayerState.DRAW_LONGBOW
  }

  hasCompletedLongBowCharge(): boolean {
    // 修正：AI需要2秒充能，玩家保持0.5秒充能
    const chargeRequiredFrames = this.isHuman ? 30 : 120
    return this.chargedFrameCount >= chargeRequiredFrames
  }

  takeDamage(): void {
    this.state = PlayerState.DAMAGED
    this.damageRemainingFrameCount = Math.floor(0.3 * 60)
    
    // 如果是AI，在受傷瞬間給予逃跑衝動
    if (!this.isHuman) {
      // 立即設置逃跑方向（遠離敵人）
      if (this.group?.enemyGroup?.player) {
        const enemy = this.group.enemyGroup.player
        const awayAngle = this.getAngle(enemy) + Math.PI // 相反方向
        const escapeForce = 5 // 強大的逃跑力量
        this.velocity = this.velocity.add(new Vector2(
          escapeForce * Math.cos(awayAngle),
          escapeForce * Math.sin(awayAngle)
        ))
        console.log('AI受傷，獲得逃跑衝動！')
      }
    }
  }

  private canSafelyAttack(enemy: AbstractPlayerActor, enemyDistance: number): boolean {
    // 1. 確保敵人在射擊範圍內
    if (enemyDistance > 500) return false
    
    // 2. 確保沒有立即危險的箭矢
    if (this.group?.enemyGroup?.arrows) {
      for (const arrow of this.group.enemyGroup.arrows) {
        const arrowDistance = this.getDistanceSq(arrow)
        // 如果有箭矢在30000像素平方內（約173像素），不要攻擊
        if (arrowDistance < 30000) return false
      }
    }
    
    // 3. 確保與敵人有合理的角度（不是完全被追趕）
    const angleToEnemy = this.getAngle(enemy)
    const escapeDirection = Math.atan2(
      this.aiMoveTarget.y - this.position.y,
      this.aiMoveTarget.x - this.position.x
    )
    
    // 計算逃跑方向與射擊方向的夾角
    let angleDiff = Math.abs(angleToEnemy - escapeDirection)
    if (angleDiff > Math.PI) angleDiff = 2 * Math.PI - angleDiff
    
    // 如果夾角大於90度，表示可以邊逃邊射
    if (angleDiff > Math.PI / 2) return true
    
    // 4. 如果敵人受傷，抓住機會攻擊
    if (enemy.isDamaged()) return true
    
    // 5. 隨機給予一些攻擊機會（20%機率）
    return Math.random() < 0.2
  }
}

export abstract class AbstractArrowActor extends Actor {
  public halfLength: number

  constructor(x: number, y: number, collisionRadius: number, halfLength: number) {
    super(x, y, collisionRadius)
    this.halfLength = halfLength
  }

  update(): void {
    super.update()
    
    const CANVAS_SIZE = 640
    if (this.position.x < -this.halfLength ||
        this.position.x > CANVAS_SIZE + this.halfLength ||
        this.position.y < -this.halfLength ||
        this.position.y > CANVAS_SIZE + this.halfLength) {
      if (this.group) {
        this.group.removeArrow(this)
      }
    }
  }

  abstract isLethal(): boolean
}

export class ShortbowArrow extends AbstractArrowActor {
  private terminalSpeed = 8

  constructor(x: number, y: number) {
    super(x, y, 8, 20)
  }

  act(): void {
    // Create particle trail occasionally (simplified)
  }

  update(): void {
    // 和原始遊戲一樣：先設定速度，再調用super.update()
    this.velocity = Vector2.fromAngle(this.directionAngle, this.speed)
    super.update()
    
    // 漸進接近終極速度 (和原始遊戲一樣)
    this.speed += (this.terminalSpeed - this.speed) * 0.1
  }

  display(p: any): void {
    p.push()
    p.translate(this.position.x, this.position.y)
    p.rotate(this.rotationAngle)
    
    p.stroke(0)
    p.fill(0)
    
    // Arrow shaft
    p.line(-this.halfLength, 0, this.halfLength, 0)
    
    // Arrow head
    const halfHeadLength = 8
    const halfHeadWidth = 4
    p.quad(
      this.halfLength, 0,
      this.halfLength - halfHeadLength, -halfHeadWidth,
      this.halfLength + halfHeadLength, 0,
      this.halfLength - halfHeadLength, halfHeadWidth
    )
    
    // Feathers (exactly like original)
    const featherLength = 8
    const halfFeatherWidth = 4
    p.line(-this.halfLength, 0, -this.halfLength - featherLength, -halfFeatherWidth)
    p.line(-this.halfLength, 0, -this.halfLength - featherLength, halfFeatherWidth)
    p.line(-this.halfLength + 4, 0, -this.halfLength - featherLength + 4, -halfFeatherWidth)
    p.line(-this.halfLength + 4, 0, -this.halfLength - featherLength + 4, halfFeatherWidth)
    p.line(-this.halfLength + 8, 0, -this.halfLength - featherLength + 8, -halfFeatherWidth)
    p.line(-this.halfLength + 8, 0, -this.halfLength - featherLength + 8, halfFeatherWidth)
    
    p.pop()
  }

  isLethal(): boolean {
    return false
  }
}

export class LongbowArrow extends AbstractArrowActor {
  constructor(x: number, y: number) {
    super(x, y, 16, 16)
  }

  act(): void {
    // Create more intense particle trail
  }

  display(p: any): void {
    p.push()
    p.translate(this.position.x, this.position.y)
    p.rotate(this.rotationAngle)
    
    p.strokeWeight(5)
    p.stroke(0)
    p.fill(0)
    
    // Thick arrow shaft
    p.line(-this.halfLength, 0, this.halfLength, 0)
    
    // Large arrow head
    const halfHeadLength = 24
    const halfHeadWidth = 24
    p.quad(
      0, 0,
      -halfHeadLength, -halfHeadWidth,
      halfHeadLength, 0,
      -halfHeadLength, halfHeadWidth
    )
    
    p.strokeWeight(1)
    p.pop()
  }

  isLethal(): boolean {
    return true
  }
} 