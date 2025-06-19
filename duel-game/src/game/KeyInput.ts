export class KeyInput {
  public isUpPressed = false
  public isDownPressed = false
  public isLeftPressed = false
  public isRightPressed = false
  public isZPressed = false
  public isXPressed = false
  public isSpacePressed = false
  public isRPressed = false

  // 添加按鍵狀態追蹤，用於區分快速點擊和長按
  private zPressedFrameCount = 0
  private xPressedFrameCount = 0
  private lastZPressFrame = -1
  private lastXPressFrame = -1
  private frameCounter = 0

  keyPressed(key: string, keyCode: number): void {
    console.log('KeyInput.keyPressed:', key, keyCode)
    
    switch (key.toLowerCase()) {
      case 'z':
        if (!this.isZPressed) {
          // 新按下Z鍵
          this.isZPressed = true
          this.lastZPressFrame = this.frameCounter
          this.zPressedFrameCount = 0
          console.log('Z key pressed - shortbow attack!')
        }
        break
      case 'x':
        if (!this.isXPressed) {
          // 新按下X鍵
          this.isXPressed = true
          this.lastXPressFrame = this.frameCounter
          this.xPressedFrameCount = 0
          console.log('X key pressed - longbow attack!')
        }
        break
      case 'r':
        this.isRPressed = true
        console.log('R key pressed - RESET GAME!')
        break
      case ' ':
        this.isSpacePressed = true
        console.log('Space key pressed')
        break
    }

    // Arrow keys - handle both keyCode and key values
    switch (keyCode) {
      case 38: // UP_ARROW
        this.isUpPressed = true
        console.log('Up arrow pressed')
        break
      case 40: // DOWN_ARROW
        this.isDownPressed = true
        console.log('Down arrow pressed')
        break
      case 37: // LEFT_ARROW
        this.isLeftPressed = true
        console.log('Left arrow pressed')
        break
      case 39: // RIGHT_ARROW
        this.isRightPressed = true
        console.log('Right arrow pressed')
        break
      case 32: // SPACE
        this.isSpacePressed = true
        console.log('Space key pressed (by code)')
        break
      case 82: // R key
        this.isRPressed = true
        console.log('R key pressed (by code) - RESET GAME!')
        break
      case 90: // Z key
        if (!this.isZPressed) {
          this.isZPressed = true
          this.lastZPressFrame = this.frameCounter
          this.zPressedFrameCount = 0
          console.log('Z key pressed (by code) - shortbow attack!')
        }
        break
      case 88: // X key
        if (!this.isXPressed) {
          this.isXPressed = true
          this.lastXPressFrame = this.frameCounter
          this.xPressedFrameCount = 0
          console.log('X key pressed (by code) - longbow attack!')
        }
        break
    }

    // Also handle by key name for broader compatibility
    switch (key) {
      case 'ArrowUp':
        this.isUpPressed = true
        console.log('Up arrow pressed (by name)')
        break
      case 'ArrowDown':
        this.isDownPressed = true
        console.log('Down arrow pressed (by name)')
        break
      case 'ArrowLeft':
        this.isLeftPressed = true
        console.log('Left arrow pressed (by name)')
        break
      case 'ArrowRight':
        this.isRightPressed = true
        console.log('Right arrow pressed (by name)')
        break
    }
  }

  keyReleased(key: string, keyCode: number): void {
    console.log('KeyInput.keyReleased:', key, keyCode)
    
    switch (key.toLowerCase()) {
      case 'z':
        this.isZPressed = false
        console.log('Z key released - shortbow attack stopped!')
        break
      case 'x':
        this.isXPressed = false
        console.log('X key released - longbow attack stopped!')
        break
      case 'r':
        this.isRPressed = false
        console.log('R key released')
        break
      case ' ':
        this.isSpacePressed = false
        console.log('Space key released')
        break
    }

    // Arrow keys - handle both keyCode and key values
    switch (keyCode) {
      case 38: // UP_ARROW
        this.isUpPressed = false
        console.log('Up arrow released')
        break
      case 40: // DOWN_ARROW
        this.isDownPressed = false
        console.log('Down arrow released')
        break
      case 37: // LEFT_ARROW
        this.isLeftPressed = false
        console.log('Left arrow released')
        break
      case 39: // RIGHT_ARROW
        this.isRightPressed = false
        console.log('Right arrow released')
        break
      case 32: // SPACE
        this.isSpacePressed = false
        console.log('Space key released (by code)')
        break
      case 82: // R key
        this.isRPressed = false
        console.log('R key released (by code)')
        break
      case 90: // Z key
        this.isZPressed = false
        console.log('Z key released (by code) - shortbow attack stopped!')
        break
      case 88: // X key
        this.isXPressed = false
        console.log('X key released (by code) - longbow attack stopped!')
        break
    }

    // Also handle by key name for broader compatibility
    switch (key) {
      case 'ArrowUp':
        this.isUpPressed = false
        console.log('Up arrow released (by name)')
        break
      case 'ArrowDown':
        this.isDownPressed = false
        console.log('Down arrow released (by name)')
        break
      case 'ArrowLeft':
        this.isLeftPressed = false
        console.log('Left arrow released (by name)')
        break
      case 'ArrowRight':
        this.isRightPressed = false
        console.log('Right arrow released (by name)')
        break
    }
  }

  update(): void {
    this.frameCounter++
    
    // 更新按鍵持續時間
    if (this.isZPressed) {
      this.zPressedFrameCount++
    }
    if (this.isXPressed) {
      this.xPressedFrameCount++
    }
  }

  // 檢查Z鍵是否剛按下（用於單發射擊）
  isZJustPressed(): boolean {
    return this.isZPressed && this.zPressedFrameCount === 1
  }

  // 檢查Z鍵是否長按（用於持續射擊）
  isZLongPressed(): boolean {
    return this.isZPressed && this.zPressedFrameCount > 6 // 0.1秒後視為長按
  }

  // 檢查X鍵是否剛按下
  isXJustPressed(): boolean {
    return this.isXPressed && this.xPressedFrameCount === 1
  }

  // Debug method to check current state
  getState(): string {
    const states = []
    if (this.isUpPressed) states.push('UP')
    if (this.isDownPressed) states.push('DOWN')
    if (this.isLeftPressed) states.push('LEFT')
    if (this.isRightPressed) states.push('RIGHT')
    if (this.isZPressed) states.push('Z')
    if (this.isXPressed) states.push('X')
    if (this.isSpacePressed) states.push('SPACE')
    if (this.isRPressed) states.push('R')
    return states.length > 0 ? states.join(', ') : 'NONE'
  }
} 