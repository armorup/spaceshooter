
const config = {
  type: Phaser.AUTO,
  scale: {
    parent: 'phaser-parent',
    mode: Phaser.Scale.FIT,
    width: 375,
    height: 812,
    autoCenter: Phaser.Scale.CENTER_BOTH
  },
  autoRound: false,
  physics: {
    default: 'arcade',
    arcade: {
      debug: false,
      gravity: { y: 0 }
    }
  },
  scene: {
    preload: preload,
    create: create,
    update: update
  }
};

const game = new Phaser.Game(config);

function preload() {
  this.load.image('ship', 'assets/PNG/playerShip1_blue.png');
  this.load.image('otherPlayer', 'assets/PNG/Enemies/enemyBlack5.png');
  this.load.image('star', 'assets/PNG/Power-ups/star_gold.png');
}

function create() {
  const self = this;
  this.socket = io();
  this.otherPlayers = this.physics.add.group();

  this.socket.on('currentPlayers', (players) => {
    for (const playerId in players) {
      if (playerId === this.socket.id) {
        addPlayer(self, players[playerId]);
      } else {
        addOtherPlayers(self, players[playerId]);
      }
    }
  });

  this.socket.on('newPlayer', (playerInfo) => {
    addOtherPlayers(self, playerInfo);
  });

  this.socket.on('disconnect', (playerId) => {
    const other = this.otherPlayers.getChildren();
    other[playerId].destroy();
  });

  this.socket.on('playerMoved', (playerInfo) => {
    self.otherPlayers.getChildren().forEach(function (otherPlayer) {
      if (playerInfo.playerId === otherPlayer.playerId) {
        otherPlayer.setRotation(playerInfo.rotation);
        otherPlayer.setPosition(playerInfo.x, playerInfo.y);
      }
    });
  });

  this.blueScoreText = this.add.text(16, 16, '', { fontSize: '32px', fill: '#0000FF' });
  this.redScoreText = this.add.text(584, 16, '', { fontSize: '32px', fill: '#FF0000' });

  this.socket.on('scoreUpdate', (scores) => {
    self.blueScoreText.setText('Blue: ' + scores.blue);
    self.redScoreText.setText('Red: ' + scores.red);
  });

  this.socket.on('starLocation', (starLocation) => {
    if (self.star) self.star.destroy();
    self.star = self.physics.add.image(starLocation.x, starLocation.y, 'star');
    self.physics.add.overlap(self.ship, self.star, () => {
      this.socket.emit('starCollected');
    }, null, self);
  });
  this.cursors = this.input.keyboard.createCursorKeys();
}

function update() {
  // Check for arrow key press
  if (this.ship) {
    let angularVelocity = 0;
    if (this.cursors.left.isDown) {
      angularVelocity = -150;
    } else if (this.cursors.right.isDown) {
      angularVelocity = 150;
    }
    this.ship.setAngularVelocity(angularVelocity);

    if (this.cursors.up.isDown) {
      this.physics.velocityFromRotation(this.ship.rotation + 1.5, -100, this.ship.body.acceleration);
    } else {
      this.ship.setAcceleration(0);
    }
    this.physics.world.wrap(this.ship, 5);

    const curx = this.ship.x;
    const cury = this.ship.y;
    const curr = this.ship.rotation;
    const oldPos = this.ship.oldPosition;
    if (oldPos && (curx !== oldPos.x || cury !== oldPos.y || curr !== oldPos.rotation)) {
      this.socket.emit('playerMovement', { x: curx, y: cury, rotation: curr });
    }
    this.ship.oldPosition = { x: curx, y: cury, rotation: curr };
  }

}

/*
*  Helper functions
*/
function addPlayer(self, playerInfo) {
  self.ship = self.physics.add.image(playerInfo.x, playerInfo.y, 'ship')
    .setOrigin(0.5, 0.5)
    .setDisplaySize(53, 40);

  const tint = (playerInfo.team === 'blue') ? 0x0000ff : 0xff0000;

  self.ship.setTint(tint);
  self.ship.setDrag(100);
  self.ship.setAngularDrag(100);
  self.ship.setMaxVelocity(200);

  self.ship.x = playerInfo.x;
  self.ship.y = playerInfo.y;
  self.ship.rotation = playerInfo.rotation;
  self.ship.oldPosition = { x: playerInfo.x, y: playerInfo.y, rotation: playerInfo.rotation };

}

function addOtherPlayers(self, playerInfo) {
  const otherPlayer = self.add.sprite(playerInfo.x, playerInfo.y, 'otherPlayer')
    .setOrigin(0.5, 0.5)
    .setDisplaySize(53, 40);
  const tint = (playerInfo.team === 'blue') ? 0x0000ff : 0xff0000;
  otherPlayer.setTint(tint);
  otherPlayer.playerId = playerInfo.playerId;
  self.otherPlayers.add(otherPlayer);

}

