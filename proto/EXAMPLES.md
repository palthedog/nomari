# Game Tree Schema Examples

This document provides examples of how to use the game tree protocol buffer schema.

## Example 1: Simple Two-Player Zero-Sum Game

This example shows a simple game tree with two players where one player's gain is another's loss.

```protobuf
# Conceptual representation (not actual proto text format)

GameTree {
  root: {
    node_id: "root"
    state: {
      state_variables: {
        "turn": { int_value: 1 }
        "round": { int_value: 1 }
      }
    }
    intermediate: {
      current_player: PLAYER_1
      available_actions: [
        { action_id: "action_A", player_action: { action_name: "Move A" } },
        { action_id: "action_B", player_action: { action_name: "Move B" } }
      ]
      transitions: [
        {
          action_id: "action_A"
          target_node: { 
            node_id: "terminal_A"
            terminal: {
              rewards: [
                { player: PLAYER_1, value: 1.0, type: REWARD_WIN },
                { player: PLAYER_2, value: -1.0, type: REWARD_LOSS }
              ]
              outcome: { 
                winner: PLAYER_1, 
                type: OUTCOME_PLAYER_1_WIN 
              }
            }
          }
          probability: 1.0
        },
        {
          action_id: "action_B"
          target_node: { 
            node_id: "terminal_B"
            terminal: {
              rewards: [
                { player: PLAYER_1, value: -1.0, type: REWARD_LOSS },
                { player: PLAYER_2, value: 1.0, type: REWARD_WIN }
              ]
              outcome: { 
                winner: PLAYER_2, 
                type: OUTCOME_PLAYER_2_WIN 
              }
            }
          }
          probability: 1.0
        }
      ]
    }
  }
  metadata: {
    game_name: "Simple Two-Player Game"
    version: "1.0"
    description: "A minimal example game tree"
  }
}
```

## Example 2: Multi-Stage Game with Opponent Modeling

This example demonstrates a game tree where opponent actions are modeled with probabilities.

```protobuf
GameTree {
  root: {
    node_id: "root"
    state: {
      state_variables: {
        "stage": { int_value: 1 }
      }
      player_states: [
        { 
          player: PLAYER_1, 
          variables: { "score": { int_value: 0 } } 
        },
        { 
          player: PLAYER_2, 
          variables: { "score": { int_value: 0 } } 
        }
      ]
    }
    intermediate: {
      current_player: PLAYER_1
      available_actions: [
        { action_id: "cooperate", player_action: { action_name: "Cooperate" } },
        { action_id: "defect", player_action: { action_name: "Defect" } }
      ]
      transitions: [
        {
          action_id: "cooperate"
          target_node: {
            node_id: "opponent_choice"
            intermediate: {
              current_player: PLAYER_2
              available_actions: [
                { 
                  action_id: "opp_cooperate", 
                  opponent_action: { 
                    action_name: "Opponent Cooperates",
                    expected_probability: 0.7,
                    opponent_model: {
                      model_type: "learned",
                      confidence: 0.85
                    }
                  } 
                },
                { 
                  action_id: "opp_defect", 
                  opponent_action: { 
                    action_name: "Opponent Defects",
                    expected_probability: 0.3,
                    opponent_model: {
                      model_type: "learned",
                      confidence: 0.85
                    }
                  } 
                }
              ]
            }
          }
          probability: 1.0
        }
      ]
    }
  }
  metadata: {
    game_name: "Prisoner's Dilemma Variant"
    version: "1.0"
  }
}
```

## Example 3: Stochastic Game with Probabilities

This example shows a game with stochastic transitions (e.g., dice rolls, random events).

```protobuf
GameTree {
  root: {
    node_id: "root"
    state: {
      state_variables: {
        "position": { int_value: 0 }
      }
    }
    intermediate: {
      current_player: PLAYER_1
      available_actions: [
        { action_id: "roll_dice", player_action: { action_name: "Roll Dice" } }
      ]
      transitions: [
        {
          action_id: "roll_dice"
          target_node: { 
            node_id: "result_1",
            state: { state_variables: { "position": { int_value: 1 } } }
          }
          probability: 0.166667  // 1/6 chance
          immediate_reward: 1.0
        },
        {
          action_id: "roll_dice"
          target_node: { 
            node_id: "result_2",
            state: { state_variables: { "position": { int_value: 2 } } }
          }
          probability: 0.166667  // 1/6 chance
          immediate_reward: 2.0
        }
        # ... additional outcomes for dice rolls 3-6
      ]
    }
  }
  metadata: {
    game_name: "Dice Game"
    version: "1.0"
  }
}
```

## Example 4: Strategy Representation

This example shows how to represent a mixed strategy solution.

```protobuf
Solution {
  type: NASH_EQUILIBRIUM
  strategies: [
    {
      player: PLAYER_1
      type: MIXED
      action_probabilities: [
        { node_id: "root", action_id: "action_A", probability: 0.4 },
        { node_id: "root", action_id: "action_B", probability: 0.6 }
      ]
      expected_value: 0.5
    },
    {
      player: PLAYER_2
      type: MIXED
      action_probabilities: [
        { node_id: "node_2", action_id: "action_C", probability: 0.5 },
        { node_id: "node_2", action_id: "action_D", probability: 0.5 }
      ]
      expected_value: 0.5
    }
  ]
  quality_metrics: {
    "epsilon": 0.001,
    "convergence_iterations": 1000.0
  }
  metadata: {
    algorithm: "Fictitious Play"
    computation_time_ms: 523
    nodes_explored: 47
  }
}
```

## Usage in Different Languages

### Python
```python
from proto import game_tree_pb2

# Create a simple game tree
tree = game_tree_pb2.GameTree()
tree.root.node_id = "root"
tree.metadata.game_name = "My Game"
tree.metadata.version = "1.0"

# Add a terminal node
terminal = tree.root.terminal
reward = terminal.rewards.add()
reward.player = game_tree_pb2.PLAYER_1
reward.value = 1.0
reward.type = game_tree_pb2.REWARD_WIN

# Serialize to bytes
serialized = tree.SerializeToString()

# Deserialize from bytes
tree2 = game_tree_pb2.GameTree()
tree2.ParseFromString(serialized)
```

### C++
```cpp
#include "proto/game_tree.pb.h"

// Create a game tree
mari::game_tree::GameTree tree;
tree.mutable_root()->set_node_id("root");
tree.mutable_metadata()->set_game_name("My Game");
tree.mutable_metadata()->set_version("1.0");

// Add a terminal node
auto* terminal = tree.mutable_root()->mutable_terminal();
auto* reward = terminal->add_rewards();
reward->set_player(mari::game_tree::PLAYER_1);
reward->set_value(1.0);
reward->set_type(mari::game_tree::REWARD_WIN);

// Serialize to string
std::string serialized;
tree.SerializeToString(&serialized);

// Deserialize from string
mari::game_tree::GameTree tree2;
tree2.ParseFromString(serialized);
```

### Java
```java
import mari.game_tree.GameTreeProtos.*;

// Create a game tree
GameTree tree = GameTree.newBuilder()
    .setRoot(Node.newBuilder()
        .setNodeId("root")
        .setTerminal(TerminalNode.newBuilder()
            .addRewards(Reward.newBuilder()
                .setPlayer(Player.PLAYER_1)
                .setValue(1.0)
                .setType(RewardType.REWARD_WIN)
            )
        )
    )
    .setMetadata(GameTreeMetadata.newBuilder()
        .setGameName("My Game")
        .setVersion("1.0")
    )
    .build();

// Serialize to bytes
byte[] serialized = tree.toByteArray();

// Deserialize from bytes
GameTree tree2 = GameTree.parseFrom(serialized);
```

## Best Practices

1. **Unique Node IDs**: Always use unique identifiers for nodes to enable proper referencing and debugging.

2. **Consistent State Representation**: Choose one state representation method (state_variables or serialized_state) and use it consistently throughout the tree.

3. **Probability Validation**: Ensure that transition probabilities from a node sum to 1.0 for deterministic action outcomes, or represent uncertainty explicitly. Note that probabilities are represented as double values, so some precision loss is acceptable (e.g., 0.166667 for 1/6 is sufficient for most applications).

4. **Action Differentiation**: Use PlayerAction for controllable actions and OpponentAction for modeled opponent behavior.

5. **Reward Consistency**: Be consistent with reward signs (positive for good outcomes, negative for bad outcomes) and use reward types appropriately.

6. **Metadata Usage**: Include rich metadata for debugging, visualization, and analysis purposes.

7. **Extensibility**: Use the metadata maps (`map<string, StateValue>`) for game-specific data that doesn't fit the standard schema.

## Integration with Solvers

The schema is designed to work seamlessly with various game-solving algorithms:

- **Minimax**: Use the tree structure directly with terminal rewards
- **Nash Equilibrium**: Represent mixed strategies using the Strategy message
- **Monte Carlo Tree Search**: Use the state representation and transitions for tree expansion
- **Alpha-Beta Pruning**: Use the tree structure with terminal rewards and state evaluation
- **Reinforcement Learning**: Use rewards and transitions for training

## Visualization

The structured format makes it easy to visualize game trees using standard tree visualization tools. Key visualization elements:

- Nodes as circles/rectangles (differentiated by type)
- Edges labeled with actions and probabilities
- Terminal nodes colored by outcome
- Player turn indicated at each intermediate node
