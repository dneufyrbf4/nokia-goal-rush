import { useEffect, useRef, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";

interface Position {
  x: number;
  y: number;
}

interface Ball extends Position {
  vx: number;
  vy: number;
}

const FIELD_WIDTH = 400;
const FIELD_HEIGHT = 600;
const PLAYER_SIZE = 20;
const BALL_SIZE = 10;
const GOAL_WIDTH = 80;
const GOAL_HEIGHT = 20;
const PLAYER_SPEED = 5;
const BALL_FRICTION = 0.95;
const KICK_POWER = 8;

export const SoccerGame = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [player, setPlayer] = useState<Position>({ x: FIELD_WIDTH / 2, y: FIELD_HEIGHT - 50 });
  const [ball, setBall] = useState<Ball>({ x: FIELD_WIDTH / 2, y: FIELD_HEIGHT / 2, vx: 0, vy: 0 });
  const [score, setScore] = useState(0);
  const [gameStarted, setGameStarted] = useState(false);
  const keysPressed = useRef<Set<string>>(new Set());
  const animationFrameRef = useRef<number>();

  const resetBall = useCallback(() => {
    setBall({ x: FIELD_WIDTH / 2, y: FIELD_HEIGHT / 2, vx: 0, vy: 0 });
  }, []);

  const checkGoal = useCallback((ballPos: Ball) => {
    const goalLeft = (FIELD_WIDTH - GOAL_WIDTH) / 2;
    const goalRight = goalLeft + GOAL_WIDTH;

    if (ballPos.y <= GOAL_HEIGHT && ballPos.x >= goalLeft && ballPos.x <= goalRight) {
      setScore(prev => prev + 1);
      toast.success("¡GOOOL! 🎉", {
        description: `Puntuación: ${score + 1}`,
      });
      resetBall();
      return true;
    }
    return false;
  }, [score, resetBall]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Clear canvas
    ctx.fillStyle = "#2d5016";
    ctx.fillRect(0, 0, FIELD_WIDTH, FIELD_HEIGHT);

    // Draw field lines
    ctx.strokeStyle = "#d4d4d8";
    ctx.lineWidth = 2;

    // Center line
    ctx.beginPath();
    ctx.moveTo(0, FIELD_HEIGHT / 2);
    ctx.lineTo(FIELD_WIDTH, FIELD_HEIGHT / 2);
    ctx.stroke();

    // Center circle
    ctx.beginPath();
    ctx.arc(FIELD_WIDTH / 2, FIELD_HEIGHT / 2, 40, 0, Math.PI * 2);
    ctx.stroke();

    // Top goal
    const goalLeft = (FIELD_WIDTH - GOAL_WIDTH) / 2;
    ctx.fillStyle = "#1a1a1a";
    ctx.fillRect(goalLeft - 4, 0, GOAL_WIDTH + 8, GOAL_HEIGHT);
    ctx.strokeStyle = "#d4d4d8";
    ctx.strokeRect(goalLeft - 4, 0, GOAL_WIDTH + 8, GOAL_HEIGHT);

    // Bottom area
    ctx.strokeRect(goalLeft - 30, FIELD_HEIGHT - 80, GOAL_WIDTH + 60, 80);

    // Player
    ctx.fillStyle = "#22c55e";
    ctx.fillRect(player.x - PLAYER_SIZE / 2, player.y - PLAYER_SIZE / 2, PLAYER_SIZE, PLAYER_SIZE);
    ctx.strokeStyle = "#16a34a";
    ctx.lineWidth = 2;
    ctx.strokeRect(player.x - PLAYER_SIZE / 2, player.y - PLAYER_SIZE / 2, PLAYER_SIZE, PLAYER_SIZE);

    // Ball
    ctx.fillStyle = "#f5f5f4";
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, BALL_SIZE / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#1a1a1a";
    ctx.stroke();
  }, [player, ball]);

  const gameLoop = useCallback(() => {
    if (!gameStarted) return;

    setPlayer(prev => {
      let newX = prev.x;
      let newY = prev.y;

      if (keysPressed.current.has("ArrowLeft")) newX -= PLAYER_SPEED;
      if (keysPressed.current.has("ArrowRight")) newX += PLAYER_SPEED;
      if (keysPressed.current.has("ArrowUp")) newY -= PLAYER_SPEED;
      if (keysPressed.current.has("ArrowDown")) newY += PLAYER_SPEED;

      newX = Math.max(PLAYER_SIZE / 2, Math.min(FIELD_WIDTH - PLAYER_SIZE / 2, newX));
      newY = Math.max(PLAYER_SIZE / 2, Math.min(FIELD_HEIGHT - PLAYER_SIZE / 2, newY));

      return { x: newX, y: newY };
    });

    setBall(prev => {
      let newBall = { ...prev };
      
      newBall.x += newBall.vx;
      newBall.y += newBall.vy;
      
      newBall.vx *= BALL_FRICTION;
      newBall.vy *= BALL_FRICTION;

      if (Math.abs(newBall.vx) < 0.1) newBall.vx = 0;
      if (Math.abs(newBall.vy) < 0.1) newBall.vy = 0;

      // Wall collisions
      if (newBall.x <= BALL_SIZE / 2 || newBall.x >= FIELD_WIDTH - BALL_SIZE / 2) {
        newBall.vx *= -0.8;
        newBall.x = Math.max(BALL_SIZE / 2, Math.min(FIELD_WIDTH - BALL_SIZE / 2, newBall.x));
      }
      if (newBall.y <= BALL_SIZE / 2 || newBall.y >= FIELD_HEIGHT - BALL_SIZE / 2) {
        newBall.vy *= -0.8;
        newBall.y = Math.max(BALL_SIZE / 2, Math.min(FIELD_HEIGHT - BALL_SIZE / 2, newBall.y));
      }

      // Player-ball collision
      const dx = newBall.x - player.x;
      const dy = newBall.y - player.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance < (PLAYER_SIZE + BALL_SIZE) / 2) {
        const angle = Math.atan2(dy, dx);
        newBall.vx = Math.cos(angle) * KICK_POWER;
        newBall.vy = Math.sin(angle) * KICK_POWER;
      }

      checkGoal(newBall);

      return newBall;
    });

    draw();
    animationFrameRef.current = requestAnimationFrame(gameLoop);
  }, [gameStarted, player, draw, checkGoal]);

  useEffect(() => {
    if (gameStarted) {
      animationFrameRef.current = requestAnimationFrame(gameLoop);
    }
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [gameStarted, gameLoop]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)) {
        e.preventDefault();
        keysPressed.current.add(e.key);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keysPressed.current.delete(e.key);
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, []);

  useEffect(() => {
    draw();
  }, [draw]);

  const startGame = () => {
    setGameStarted(true);
    setScore(0);
    resetBall();
    setPlayer({ x: FIELD_WIDTH / 2, y: FIELD_HEIGHT - 50 });
    toast.info("Usa las flechas para moverte", {
      description: "¡Mete goles en la portería superior!",
    });
  };

  return (
    <div className="flex flex-col items-center gap-6 p-4">
      <Card className="p-6 bg-card border-2 border-border">
        <div className="flex flex-col items-center gap-4">
          <div className="retro-text text-2xl text-primary">⚽ FÚTBOL RETRO</div>
          <div className="retro-text text-xl text-foreground">GOLES: {score}</div>
          
          <canvas
            ref={canvasRef}
            width={FIELD_WIDTH}
            height={FIELD_HEIGHT}
            className="border-4 border-primary pixel-border"
          />

          {!gameStarted ? (
            <Button onClick={startGame} className="retro-text bg-primary hover:bg-accent">
              INICIAR JUEGO
            </Button>
          ) : (
            <Button onClick={() => setGameStarted(false)} variant="secondary" className="retro-text">
              PAUSAR
            </Button>
          )}

          <div className="text-sm text-muted-foreground retro-text text-center">
            <p>▲▼◄► MOVER JUGADOR</p>
            <p>EMPUJA LA PELOTA AL GOL</p>
          </div>
        </div>
      </Card>
    </div>
  );
};
