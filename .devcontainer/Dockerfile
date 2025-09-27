FROM mcr.microsoft.com/devcontainers/base:ubuntu-24.04

# Install Node, Ruby, and dependencies
RUN apt-get update && DEBIAN_FRONTEND=noninteractive apt-get install -y     curl git build-essential libssl-dev libreadline-dev zlib1g-dev     ruby-full     && rm -rf /var/lib/apt/lists/*

# Node via nvm
ENV NVM_DIR=/usr/local/nvm
RUN mkdir -p $NVM_DIR
ENV NODE_VERSION=20.15.1
RUN bash -lc "curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash &&     . $NVM_DIR/nvm.sh && nvm install $NODE_VERSION && nvm alias default $NODE_VERSION && nvm use default"
ENV PATH=$NVM_DIR/versions/node/v$NODE_VERSION/bin:$PATH

# Shopify CLI
RUN npm install -g @shopify/cli @shopify/theme

# Gems
RUN gem install bundler

WORKDIR /workspaces/repo
