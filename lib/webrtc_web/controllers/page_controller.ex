defmodule WebrtcWeb.PageController do
  use WebrtcWeb, :controller

  def index(conn, _params) do
    render(conn, "index.html")
  end
end
