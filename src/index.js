// chargement des librairies

/***********************************************************************/
/** CONFIGURATION GLOBALE DU JEU ET LANCEMENT 
/***********************************************************************/

// configuration générale du jeu
var config = {
  type: Phaser.AUTO,
  width: 800, // largeur en pixels
  height: 600, // hauteur en pixels
  physics: {
    // définition des parametres physiques
    default: "arcade", // mode arcade : le plus simple : des rectangles pour gérer les collisions. Pas de pentes
    arcade: {
      // parametres du mode arcade
      gravity: {
        y: 300 // gravité verticale : acceleration ddes corps en pixels par seconde
      },
      debug: true // permet de voir les hitbox et les vecteurs d'acceleration quand mis à true
    }
  },
  scene: {
    // une scene est un écran de jeu. Pour fonctionner il lui faut 3 fonctions  : create, preload, update
    preload: preload, // la phase preload est associée à la fonction preload, du meme nom (on aurait pu avoir un autre nom)
    create: create, // la phase create est associée à la fonction create, du meme nom (on aurait pu avoir un autre nom)
    update: update // la phase update est associée à la fonction update, du meme nom (on aurait pu avoir un autre nom)
  }
};

// création et lancement du jeu
new Phaser.Game(config);


/***********************************************************************/
/** FONCTION PRELOAD 
/***********************************************************************/

/** La fonction preload est appelée une et une seule fois,
 * lors du chargement de la scene dans le jeu.
 * On y trouve surtout le chargement des assets (images, son ..)
 */
function preload() {
  this.load.image("img_ciel", "src/assets/sky.png");
  this.load.image("img_plateforme", "src/assets/platform.png");
  this.load.image("img_etoile", "src/assets/star.png");
  this.load.spritesheet("img_perso", "src/assets/dude.png", {
    frameWidth: 32,
    frameHeight: 48
  });
  // chargement tuiles de jeu
  this.load.image("Phaser_tuilesdejeu", "src/assets/tuilesJeu.png");

  // chargement de la carte
  this.load.tilemapTiledJSON("carte", "src/assets/map.json");
}

/***********************************************************************/
/** FONCTION CREATE 
/***********************************************************************/

/* La fonction create est appelée lors du lancement de la scene
 * si on relance la scene, elle sera appelée a nouveau
 * on y trouve toutes les instructions permettant de créer la scene
 * placement des peronnages, des sprites, des platesformes, création des animations
 * ainsi que toutes les instructions permettant de planifier des evenements
 */
function create() {
  player = this.physics.add.sprite(300, 150, "img_perso"); 
  player.setCollideWorldBounds(true);
  player.setBounce(0.2);
  clavier = this.input.keyboard.createCursorKeys();
  // dans cette partie, on crée les animations, à partir des spritesheet
  // chaque animation est une succession de frame à vitesse de défilement défini
  // une animation doit avoir un nom. Quand on voudra la jouer sur un sprite, on utilisera la méthode play()
  // creation de l'animation "anim_tourne_gauche" qui sera jouée sur le player lorsque ce dernier tourne à gauche
  this.anims.create({
    key: "anim_tourne_gauche", // key est le nom de l'animation : doit etre unique poru la scene.
    frames: this.anims.generateFrameNumbers("img_perso", { start: 0, end: 3 }), // on prend toutes les frames de img perso numerotées de 0 à 3
    frameRate: 10, // vitesse de défilement des frames
    repeat: -1 // nombre de répétitions de l'animation. -1 = infini
  });
  this.anims.create({
    key: "anim_tourne_droite",
    frames: this.anims.generateFrameNumbers("img_perso", { start: 5, end: 8 }),
    frameRate: 10,
    repeat: -1
  });
  this.anims.create({
    key: "anim_face",
    frames: [{ key: "img_perso", frame: 4 }],
    frameRate: 20
  });
  groupe_etoiles = this.physics.add.group();

  for (var i = 0; i < 10; i++) {
    var coordX = 70 + 70 * i;
    groupe_etoiles.create(coordX, 10, "img_etoile");
  }
  groupe_etoiles.children.iterate(function iterateur(etoile_i) {
    // On tire un coefficient aléatoire de rerebond : valeur entre 0.4 et 0.8
    var coef_rebond = Phaser.Math.FloatBetween(0.4, 0.8);
    etoile_i.setBounceY(coef_rebond); // on attribut le coefficient de rebond à l'étoile etoile_i
  });
  this.physics.add.overlap(
    player,
    groupe_etoiles,
    ramasserEtoile,
    null,
    this
  );
  zone_texte_score = this.add.text(16, 16, 'score: 0', { fontSize: '32px', fill: '#000' });
  groupe_bombes = this.physics.add.group();
  this.physics.add.collider(groupe_bombes, groupe_plateformes);
  // chargement de la carte
  const carteDuNiveau = this.add.tilemap("carte");

  // chargement du jeu de tuiles
  const tileset = carteDuNiveau.addTilesetImage(
    "tuiles_de_jeu",
    "Phaser_tuilesdejeu"
  );
  // chargement du calque calque_background
  const calque_background = carteDuNiveau.createLayer(
    "calque_background",
    tileset
  );

  // chargement du calque calque_background_2
  const calque_background_2 = carteDuNiveau.createLayer(
    "Calque de Tuiles 1",
    tileset
  );

  // chargement du calque calque_plateformes
  const calque_plateformes = carteDuNiveau.createLayer(
    "calque_plateformes",
    tileset
  );
  // définition des tuiles de plateformes qui sont solides
  // utilisation de la propriété estSolide
  calque_plateformes.setCollisionByProperty({ estSolide: true });
  // ajout d'une collision entre le joueur et le calque plateformes
  this.physics.add.collider(player, calque_plateformes);
  // redimentionnement du monde avec les dimensions calculées via tiled
  this.physics.world.setBounds(0, 0, 3200, 640);
  //  ajout du champs de la caméra de taille identique à celle du monde
  this.cameras.main.setBounds(0, 0, 3200, 640);
  // ancrage de la caméra sur le joueur
  this.cameras.main.startFollow(player);
  player.setDepth(100);
}
/***********************************************************************/
/** FONCTION UPDATE 
/***********************************************************************/

function update() {
  if (gameOver) {
    return;
  }
  function chocAvecBombe(un_player, une_bombe) {
    this.physics.pause();
    player.setTint(0xff0000);
    player.anims.play("anim_face");
    gameOver = true;
  }
  this.physics.add.collider(player, groupe_bombes, chocAvecBombe, null, this);
  if (clavier.right.isDown) {
    player.setVelocityX(160);
    player.anims.play("anim_tourne_droite", true);
  }
  else if (clavier.left.isDown) {
    player.setVelocityX(-160);
    player.anims.play("anim_tourne_gauche", true);
  }
  else {
    player.setVelocityX(0);
    player.anims.play("anim_face", true);
  }

  if (clavier.up.isDown && player.body.blocked.down) {
    player.setVelocityY(-200);
  }
}


function ramasserEtoile(un_player, une_etoile) {
  // on désactive l’étoile ramassée
  une_etoile.disableBody(true, true);

  // on vérifie s'il reste encore des étoiles actives
  if (groupe_etoiles.countActive(true) === 0) {

    // si toutes les étoiles sont ramassées,
    // on les réactive toutes
    groupe_etoiles.children.iterate(function (etoile_i) {
      etoile_i.enableBody(true, etoile_i.x, 0, true, true);
    });
  }
  score += 10;
  zone_texte_score.setText("Score: " + score);
  // on ajoute une nouvelle bombe au jeu
  // - on génère une nouvelle valeur x qui sera l'abcisse de la bombe
  var x;
  if (player.x < 400) {
    x = Phaser.Math.Between(400, 800);
  } else {
    x = Phaser.Math.Between(0, 400);
  }
  var une_bombe = groupe_bombes.create(x, 16, "img_bombe");
  une_bombe.setBounce(1);
  une_bombe.setCollideWorldBounds(true);
  une_bombe.setVelocity(Phaser.Math.Between(-200, 200), 20);
  une_bombe.allowGravity = false;
}



var groupe_plateformes;
var player;
var clavier;
var groupe_etoiles;
var score = 0;
var zone_texte_score;
var groupe_bombes;
var gameOver = false;