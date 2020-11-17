defmodule Webrtc.Application do
  # See https://hexdocs.pm/elixir/Application.html
  # for more information on OTP Applications
  @moduledoc false

  use Application

  def start(_type, _args) do
    children = [
      # Start the Telemetry supervisor
      WebrtcWeb.Telemetry,
      # Start the PubSub system
      {Phoenix.PubSub, name: Webrtc.PubSub},
      # Start the Endpoint (http/https)
      WebrtcWeb.Endpoint
      # Start a worker by calling: Webrtc.Worker.start_link(arg)
      # {Webrtc.Worker, arg}
    ]

    # See https://hexdocs.pm/elixir/Supervisor.html
    # for other strategies and supported options
    opts = [strategy: :one_for_one, name: Webrtc.Supervisor]
    Supervisor.start_link(children, opts)
  end

  # Tell Phoenix to update the endpoint configuration
  # whenever the application is updated.
  def config_change(changed, _new, removed) do
    WebrtcWeb.Endpoint.config_change(changed, removed)
    :ok
  end
end
