from setuptools import setup, find_packages

with open("requirements.txt") as f:
	install_requires = f.read().strip().split("\n")

# get version from __version__ variable in systemair_app/__init__.py
from systemair_app import __version__ as version

setup(
	name="systemair_app",
	version=version,
	description="SystemAir Fan Cost Calculator and Quotation App",
	author="Nest Software",
	author_email="info@nestsoftware.com",
	packages=find_packages(),
	zip_safe=False,
	include_package_data=True,
	install_requires=install_requires
)
