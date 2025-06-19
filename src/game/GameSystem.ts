import { Vector2 } from './Vector2'
import { KeyInput } from './KeyInput'
import type { ActorGroup } from './Actor'
import {
  AbstractPlayerActor,
  PlayerActor,
  NullPlayerActor,
  AbstractArrowActor,
  ShortbowArrow,
  LongbowArrow,
  PlayerState
} from './Actor'

export enum GameState {
  START,
  PLAYING,
  GAME_OVER
}

export class GameActorGroup implements ActorGroup {
  player: AbstractPlayerActor
  arrows: AbstractArrowActor[] = []
  enemyGroup?: ActorGroup
  private arrowsToRemove: AbstractArrowActor[] = []
  private lastAIShootFrame: number = 0

  constructor(player: AbstractPlayerActor) {
    this.player = player
    player.group = this
  }

  addArrow(arrow: AbstractArrowActor): void {
    this.arrows.push(arrow)
    arrow.group = this
  }

  removeArrow(arrow: AbstractArrowActor): void {
    this.arrowsToRemove.push(arrow)
  }

  update(): void {
    this.player.update()

    // Remove arrows marked for removal
    if (this.arrowsToRemove.length > 0) {
      this.arrows = this.arrows.filter(arrow => !this.arrowsToRemove.includes(arrow))
      this.arrowsToRemove = []
    }

    // Update arrows
    for (const arrow of this.arrows) {
      arrow.update()
    }
  }

  act(frameCount: number): void {
    const previousState = this.player.state
    this.player.act()

    // Handle AI shooting
    if (!this.player.isNull() && !(this.player as PlayerActor).isHuman) {
      const aiPlayer = this.player as PlayerActor
      
      // Check if AI just transitioned to shooting state
      if (previousState === PlayerState.MOVE && aiPlayer.state === PlayerState.DRAW_SHORTBOW) {
        this.fireAIShortbow(aiPlayer, frameCount)
      }
      
      // Handle ongoing shortbow shooting
      if (aiPlayer.state === PlayerState.DRAW_SHORTBOW && frameCount % 12 === 0) {
        this.fireAIShortbow(aiPlayer, frameCount)
      }
      
      // Handle longbow shooting
      if (previousState === PlayerState.DRAW_LONGBOW && aiPlayer.state === PlayerState.MOVE && 
          aiPlayer.hasCompletedLongBowCharge()) {
        this.fireAILongbow(aiPlayer)
        console.log('AI completed longbow charge and fired!')
      }
    }

    // Update arrows
    for (const arrow of this.arrows) {
      arrow.act()
    }
  }

  private fireAIShortbow(player: PlayerActor, frameCount: number): void {
    if (frameCount - this.lastAIShootFrame < 8) return // Rate limiting
    
    const arrow = new ShortbowArrow(
      player.position.x + 24 * Math.cos(player.aimAngle),
      player.position.y + 24 * Math.sin(player.aimAngle)
    )
    arrow.rotationAngle = player.aimAngle
    arrow.setVelocity(player.aimAngle, 24)
    this.addArrow(arrow) // AI的箭矢加到自己的群組
    this.lastAIShootFrame = frameCount
    console.log('AI fired shortbow arrow!')
  }

  private fireAILongbow(player: PlayerActor): void {
    // Create multiple arrow components for longbow (exactly like player)
    const arrowComponentInterval = 24
    const arrowShaftNumber = 5
    
    for (let i = 0; i < arrowShaftNumber; i++) {
      const arrow = new LongbowArrow(
        player.position.x + i * arrowComponentInterval * Math.cos(player.aimAngle),
        player.position.y + i * arrowComponentInterval * Math.sin(player.aimAngle)
      )
      arrow.rotationAngle = player.aimAngle
      arrow.setVelocity(player.aimAngle, 64)
      this.addArrow(arrow) // AI的箭矢加到自己的群組
    }
    
    // Add the head as a separate component
    const headArrow = new LongbowArrow(
      player.position.x + arrowShaftNumber * arrowComponentInterval * Math.cos(player.aimAngle),
      player.position.y + arrowShaftNumber * arrowComponentInterval * Math.sin(player.aimAngle)
    )
    headArrow.rotationAngle = player.aimAngle
    headArrow.setVelocity(player.aimAngle, 64)
    this.addArrow(headArrow) // AI的箭矢加到自己的群組
    
    console.log('AI fired longbow arrow!')
  }

  display(p: any): void {
    this.player.display(p)
    for (const arrow of this.arrows) {
      arrow.display(p)
    }
  }
}

export class GameSystem {
  private p: any
  private myGroup: GameActorGroup
  private otherGroup: GameActorGroup
  private gameState: GameState = GameState.START
  private frameCount = 0
  private countdownNumber = 3
  private screenShake = 0
  private gameMessage = ''
  private messageTimer = 0

  public isDemoMode: boolean
  public showsInstructionWindow: boolean

  constructor(p5Instance: any, demoMode: boolean = false, showInstructions: boolean = false) {
    this.p = p5Instance
    this.isDemoMode = demoMode
    this.showsInstructionWindow = showInstructions

    // Create player actors
    const myPlayer = new PlayerActor(320, 540, 'white', !demoMode)
    const otherPlayer = new PlayerActor(320, 100, 'black', false)

    // Create actor groups
    this.myGroup = new GameActorGroup(myPlayer)
    this.otherGroup = new GameActorGroup(otherPlayer)
    
    // Set enemy references
    this.myGroup.enemyGroup = this.otherGroup
    this.otherGroup.enemyGroup = this.myGroup

    this.gameState = GameState.START
  }

  run(keyInput: KeyInput): void {
    this.frameCount++

    // 檢查 demo 模式下的空白鍵開始遊戲（與原始遊戲一致）
    if (this.isDemoMode && keyInput.isSpacePressed) {
      console.log('Demo mode detected SPACE key, but should be handled by DuelGame.vue')
      return
    }

    // Handle screen shake
    if (this.screenShake > 0) {
      this.p.push()
      this.p.translate(
        (Math.random() - 0.5) * this.screenShake,
        (Math.random() - 0.5) * this.screenShake
      )
      this.screenShake -= 50 / 60 // Decrease by 50 per second
      if (this.screenShake < 0) this.screenShake = 0
    }

    // Draw background
    this.drawBackground()

    // Run game logic based on state
    switch (this.gameState) {
      case GameState.START:
        this.runStartState()
        break
      case GameState.PLAYING:
        this.runPlayingState(keyInput)
        break
      case GameState.GAME_OVER:
        this.runGameOverState(keyInput)
        break
    }

    // End screen shake
    if (this.screenShake > 0) {
      this.p.pop()
    }

    this.drawUI()
  }

  private drawBackground(): void {
    // Simple animated background lines
    this.p.stroke(224)
    this.p.strokeWeight(1)
    for (let i = 0; i < 10; i++) {
      const x = (i * 64 + this.frameCount * 0.5) % 640
      this.p.line(x, 0, x, 640)
    }
    for (let i = 0; i < 10; i++) {
      const y = (i * 64 + this.frameCount * 0.3) % 640
      this.p.line(0, y, 640, y)
    }
  }

  private runStartState(): void {
    // Update and display players (but don't act)
    this.myGroup.update()
    this.otherGroup.update()
    this.myGroup.display(this.p)
    this.otherGroup.display(this.p)

    // Countdown
    const countdownFrames = 60 // 1 second per number
    if (this.frameCount % countdownFrames === 0 && this.countdownNumber > 0) {
      this.countdownNumber--
    }

    if (this.countdownNumber > 0) {
      this.p.push()
      this.p.translate(320, 320) // 移動到畫面中央
      
      // 設定文字樣式和對齊
      this.p.fill(0)
      this.p.textSize(96)
      this.p.textAlign(this.p.CENTER, this.p.CENTER)
      
      // 顯示倒數數字（確保在圓圈中央）
      this.p.text(this.countdownNumber.toString(), 0, 0)
      
      // Draw countdown ring
      this.p.noFill()
      this.p.stroke(0)
      this.p.strokeWeight(3)
      const progress = (this.frameCount % countdownFrames) / countdownFrames
      this.p.arc(0, 0, 200, 200, -Math.PI/2, -Math.PI/2 + progress * Math.PI * 2)
      this.p.strokeWeight(1)
      this.p.pop()
    } else {
      this.gameState = GameState.PLAYING
      this.gameMessage = 'Go!'
      this.messageTimer = 60
    }
  }

  private runPlayingState(keyInput: KeyInput): void {
    // Handle player input
    this.handlePlayerInput(keyInput)

    // Update game objects
    this.myGroup.update()
    this.myGroup.act(this.frameCount)
    this.otherGroup.update()
    this.otherGroup.act(this.frameCount)

    // Check collisions
    this.checkCollisions()

    // Display everything
    this.myGroup.display(this.p)
    this.otherGroup.display(this.p)

    // Check win conditions
    if (this.myGroup.player.isNull()) {
      this.gameState = GameState.GAME_OVER
      this.gameMessage = 'You lose!'
      this.messageTimer = 600
    } else if (this.otherGroup.player.isNull()) {
      this.gameState = GameState.GAME_OVER
      this.gameMessage = 'You win!'
      this.messageTimer = 600
    }

    // Update message timer
    if (this.messageTimer > 0) {
      this.messageTimer--
    }
  }

  private runGameOverState(keyInput: KeyInput): void {
    // Update and display (but don't act)
    this.myGroup.update()
    this.otherGroup.update()
    this.myGroup.display(this.p)
    this.otherGroup.display(this.p)

    // Debug info for reset
    if (this.frameCount % 30 === 0) { // 每半秒輸出一次調試信息
      console.log(`Game Over State - messageTimer: ${this.messageTimer}, R pressed: ${keyInput.isRPressed}, Frame: ${this.frameCount}`)
    }
    
    // 檢查重置按鍵（改為R鍵重置），現在可以立即重置
    if (keyInput.isRPressed) {
      console.log('Resetting game with R key! messageTimer was:', this.messageTimer)
      // 修正：重置後應該進入倒數畫面，不是demo模式
      this.resetToNewGame()
      return // 立即返回，避免繼續執行
    }

    if (this.messageTimer > 0) {
      this.messageTimer--
    }
  }

  // 修正：重置到新遊戲（倒數畫面）而不是demo模式
  private resetToNewGame(): void {
    // 重新創建玩家（玩家仍是人類）
    const myPlayer = new PlayerActor(320, 540, 'white', true) // 人類玩家
    const otherPlayer = new PlayerActor(320, 100, 'black', false) // AI玩家
    
    this.myGroup = new GameActorGroup(myPlayer)
    this.otherGroup = new GameActorGroup(otherPlayer)
    
    this.myGroup.enemyGroup = this.otherGroup
    this.otherGroup.enemyGroup = this.myGroup
    
    this.gameState = GameState.START // 進入倒數狀態
    this.frameCount = 0
    this.countdownNumber = 3
    this.gameMessage = ''
    this.messageTimer = 0
  }

  private handlePlayerInput(keyInput: KeyInput): void {
    const player = this.myGroup.player as PlayerActor
    
    if (player.isNull()) return

    // Convert boolean inputs to -1, 0, 1 like original game
    const horizontalMoveButton = (keyInput.isLeftPressed ? -1 : 0) + (keyInput.isRightPressed ? 1 : 0)
    const verticalMoveButton = (keyInput.isUpPressed ? -1 : 0) + (keyInput.isDownPressed ? 1 : 0)

    switch (player.state) {
      case PlayerState.MOVE:
        // Movement with exact same scale as original game
        player.addVelocity(1.0 * horizontalMoveButton, 1.0 * verticalMoveButton)

        // Z鍵短弓攻擊：快速點擊單發，長按連發
        if (keyInput.isZJustPressed()) {
          // 單發射擊
          player.aimAngle = player.getAngle(this.otherGroup.player)
          this.fireShortbow(player)
          console.log('Player single-shot shortbow! Frame:', this.frameCount)
        } else if (keyInput.isZLongPressed()) {
          // 進入持續射擊模式
          player.state = PlayerState.DRAW_SHORTBOW
          player.aimAngle = player.getAngle(this.otherGroup.player)
          console.log('Player entering continuous shortbow mode! Frame:', this.frameCount)
        }

        // X鍵長弓攻擊
        if (keyInput.isXJustPressed()) {
          player.state = PlayerState.DRAW_LONGBOW
          player.aimAngle = player.getAngle(this.otherGroup.player)
          player.chargedFrameCount = 0
          console.log('Player drawing longbow! Frame:', this.frameCount)
        }
        break

      case PlayerState.DRAW_SHORTBOW:
        // 持續射擊模式：移動速度降低
        player.addVelocity(0.25 * horizontalMoveButton, 0.25 * verticalMoveButton)

        // Auto-aim at enemy (與原始遊戲一致)
        player.aimAngle = player.getAngle(this.otherGroup.player)

        // 持續射擊：每12幀射一箭
        if (keyInput.isZPressed) {
          if (this.frameCount % 12 === 0) {
            this.fireShortbow(player)
            console.log('Player continuous shortbow fire! Frame:', this.frameCount)
          }
        } else {
          // 鬆開Z鍵停止持續射擊
          player.state = PlayerState.MOVE
          console.log('Player stopped continuous shortbow')
        }
        break

      case PlayerState.DRAW_LONGBOW:
        // 長弓充能：移動速度降低
        player.addVelocity(0.25 * horizontalMoveButton, 0.25 * verticalMoveButton)

        // Auto-aim at enemy like original game
        player.aimAngle = player.getAngle(this.otherGroup.player)

        // Release to fire (if charged) or cancel
        if (!keyInput.isXPressed) {
          if (player.hasCompletedLongBowCharge()) {
            this.fireLongbow(player)
            console.log('Player fired charged longbow!')
          } else {
            console.log('Player cancelled longbow (not charged)')
          }
          player.state = PlayerState.MOVE
        }
        break
    }
  }

  private fireShortbow(player: PlayerActor): void {
    const arrow = new ShortbowArrow(
      player.position.x + 24 * Math.cos(player.aimAngle),
      player.position.y + 24 * Math.sin(player.aimAngle)
    )
    arrow.rotationAngle = player.aimAngle
    arrow.setVelocity(player.aimAngle, 24)  // 原始遊戲的初始速度是24
    this.myGroup.addArrow(arrow)
    console.log('Player fired shortbow arrow!')
  }

  private fireLongbow(player: PlayerActor): void {
    // Create multiple arrow components (exactly like original)
    const arrowComponentInterval = 24
    const arrowShaftNumber = 5
    
    for (let i = 0; i < arrowShaftNumber; i++) {
      const arrow = new LongbowArrow(
        player.position.x + i * arrowComponentInterval * Math.cos(player.aimAngle),
        player.position.y + i * arrowComponentInterval * Math.sin(player.aimAngle)
      )
      arrow.rotationAngle = player.aimAngle
      arrow.setVelocity(player.aimAngle, 64)
      this.myGroup.addArrow(arrow)
    }
    
    // Add the head as a separate component
    const headArrow = new LongbowArrow(
      player.position.x + arrowShaftNumber * arrowComponentInterval * Math.cos(player.aimAngle),
      player.position.y + arrowShaftNumber * arrowComponentInterval * Math.sin(player.aimAngle)
    )
    headArrow.rotationAngle = player.aimAngle
    headArrow.setVelocity(player.aimAngle, 64)
    this.myGroup.addArrow(headArrow)
    
    this.screenShake += 10
    console.log('Player fired longbow arrow!')
  }

  private checkCollisions(): void {
    // Arrow vs arrow collisions (check all combinations)
    for (let i = this.myGroup.arrows.length - 1; i >= 0; i--) {
      const myArrow = this.myGroup.arrows[i]
      for (let j = this.otherGroup.arrows.length - 1; j >= 0; j--) {
        const enemyArrow = this.otherGroup.arrows[j]
        if (myArrow.isCollided(enemyArrow)) {
          this.myGroup.removeArrow(myArrow)
          this.otherGroup.removeArrow(enemyArrow)
          this.addParticles(myArrow.position.x, myArrow.position.y, 10, 7, 1, 5, 1) // break arrow particles
          this.screenShake += 5
          break
        }
      }
    }

    // My arrows vs enemy player
    if (!this.otherGroup.player.isNull()) {
      for (let i = this.myGroup.arrows.length - 1; i >= 0; i--) {
        const arrow = this.myGroup.arrows[i]
        if (arrow.isCollided(this.otherGroup.player)) {
          if (arrow.isLethal()) {
            this.killPlayer(this.otherGroup)
          } else {
            this.damagePlayer(this.otherGroup.player as PlayerActor, arrow)
          }
          this.myGroup.removeArrow(arrow)
          break
        }
      }
    }

    // Enemy arrows vs my player
    if (!this.myGroup.player.isNull()) {
      for (let i = this.otherGroup.arrows.length - 1; i >= 0; i--) {
        const arrow = this.otherGroup.arrows[i]
        if (arrow.isCollided(this.myGroup.player)) {
          if (arrow.isLethal()) {
            this.killPlayer(this.myGroup)
          } else {
            this.damagePlayer(this.myGroup.player as PlayerActor, arrow)
          }
          this.otherGroup.removeArrow(arrow)
          break
        }
      }
    }
  }

  private killPlayer(group: GameActorGroup): void {
    // 與原始遊戲一致的死亡特效
    this.addParticles(group.player.position.x, group.player.position.y, 50, 16, 2, 10, 4) // kill particles
    group.player = new NullPlayerActor()
    this.screenShake += 50
    console.log('Player killed!')
  }

  private damagePlayer(player: PlayerActor, arrow: AbstractArrowActor): void {
    // Apply thrust
    const angle = arrow.position.angle(player.position)
    const thrustAngle = angle + (Math.random() - 0.5) * Math.PI
    player.velocity = player.velocity.add(Vector2.fromAngle(thrustAngle, 20))
    
    player.takeDamage()
    this.screenShake += 10
    this.addParticles(arrow.position.x, arrow.position.y, 5, 4, 1, 3, 0.5) // damage particles
    console.log('Player damaged!')
  }

  // 改善粒子效果，與原始遊戲更一致
  private addParticles(x: number, y: number, count: number, size: number, minSpeed: number, maxSpeed: number, lifespanSeconds: number): void {
    this.p.push()
    this.p.fill(0) // 黑色粒子
    this.p.noStroke()
    
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2
      const speed = minSpeed + Math.random() * (maxSpeed - minSpeed)
      const lifetime = lifespanSeconds * 60 // 轉換為幀數
      
      // 簡化的粒子效果（在完整實現中會有真正的粒子系統）
      const px = x + Math.cos(angle) * speed * 5
      const py = y + Math.sin(angle) * speed * 5
      const particleSize = size + Math.random() * 4
      
      this.p.ellipse(px, py, particleSize, particleSize)
    }
    this.p.pop()
  }

  private drawUI(): void {
    // Draw messages (確保在畫面中央)，遊戲結束時使用淡入淡出效果
    if (this.gameState === GameState.GAME_OVER && this.gameMessage) {
      this.p.push()
      this.p.translate(320, 320) // 移動到畫面中央
      
      // 計算淡入淡出的透明度
      let alpha = 255
      const totalTime = 600 // 總計時器時間
      const fadeStartTime = 60 // 前1秒完全顯示
      const timeElapsed = totalTime - this.messageTimer // 已經過的時間
      
      if (timeElapsed > fadeStartTime) {
        // 1秒後開始淡入淡出：使用正弦波創造循環的呼吸效果
        // 5秒週期 = 60fps * 5秒 = 300幀，所以頻率為 2π / 300 ≈ 0.021
        const breathe = Math.sin(timeElapsed * 0.021) * 0.4 + 0.6 // 0.2 - 1.0之間循環變化，5秒週期
        alpha = Math.max(50, 255 * breathe) // 最少保持50的透明度，最多255
      }
      
      this.p.fill(0, alpha)
      this.p.textSize(48)
      this.p.textAlign(this.p.CENTER, this.p.CENTER)
      this.p.text(this.gameMessage, 0, 0)
      
      // 重置提示也使用相同的淡入淡出效果
      this.p.textSize(20)
      this.p.fill(0, alpha * 0.8) // 稍微更透明一些
      this.p.text('Press R key to reset', 0, 80) // 在主訊息下方
      
      this.p.pop()
    } else if (this.messageTimer > 0 && this.gameMessage) {
      // 其他情況的一般訊息顯示（如倒數）
      this.p.push()
      this.p.translate(320, 320) // 移動到畫面中央
      
      // 訊息的透明度隨時間衰減
      const alpha = Math.min(255, 255 * (this.messageTimer / 60))
      this.p.fill(0, alpha)
      this.p.textSize(48)
      this.p.textAlign(this.p.CENTER, this.p.CENTER)
      this.p.text(this.gameMessage, 0, 0)
      
      this.p.pop()
    }

    // Debug info (remove in production)
    if (this.gameState === GameState.PLAYING && !this.isDemoMode) {
      this.p.push()
      this.p.fill(0)
      this.p.textSize(12)
      this.p.textAlign(this.p.LEFT, this.p.TOP)
      this.p.text(`Arrows: P=${this.myGroup.arrows.length} AI=${this.otherGroup.arrows.length}`, 10, 10)
      this.p.text(`Player State: ${PlayerState[this.myGroup.player.state]}`, 10, 25)
      this.p.text(`AI State: ${PlayerState[this.otherGroup.player.state]}`, 10, 40)
      this.p.pop()
    }
  }

  toggleInstructions(): void {
    this.showsInstructionWindow = !this.showsInstructionWindow
  }
} 